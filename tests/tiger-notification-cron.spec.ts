import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const work=vi.hoisted(()=>({messages:vi.fn(),sets:vi.fn(),notifications:vi.fn()}));
vi.mock('@/server/services/messages',()=>({runMessageSchedules:work.messages}));
vi.mock('@/server/services/email-sets',()=>({runEmailSets:work.sets}));
vi.mock('@/server/services/notification-mail',()=>({flushNotificationMail:work.notifications}));
import {GET} from '../app/api/cron/messages/route';
const previous=process.env.CRON_SECRET;
beforeEach(()=>{vi.resetAllMocks();process.env.CRON_SECRET='fixture-cron-secret';work.messages.mockResolvedValue({accepted:0});work.sets.mockResolvedValue({accepted:0});work.notifications.mockResolvedValue({accepted:1,failed:0});});
afterEach(()=>{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;});
describe('Independent, authenticated notification scheduling',()=>{
 it('rejects anonymous scheduler calls before running any mail worker',async()=>{const r=await GET(new Request('https://example.test/api/cron/messages'));expect(r.status).toBe(401);expect(work.notifications).not.toHaveBeenCalled();});
 it('runs notification delivery even when a different queue fails',async()=>{work.messages.mockRejectedValue(Error('unrelated mail queue'));const r=await GET(new Request('https://example.test/api/cron/messages',{headers:{authorization:'Bearer fixture-cron-secret'}}));expect(r.status).toBe(503);expect(work.sets).toHaveBeenCalledOnce();expect(work.notifications).toHaveBeenCalledOnce();expect((await r.json()).notifications.accepted).toBe(1);});
});
