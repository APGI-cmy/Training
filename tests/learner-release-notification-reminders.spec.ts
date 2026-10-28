import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),sync:vi.fn(),rest:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/server/services/notifications',()=>({notificationSession:m.session,notificationSentMessages:m.sync,notificationDestination:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
import {remindNotification} from '@/server/actions/notifications';
const actor='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:actor}});m.sync.mockResolvedValue({items:[],total:0});m.rest.mockResolvedValue(new Response(JSON.stringify('reminder')));});
describe('Sender-owned message reminders',()=>{
 it('derives sender from the signed-in session and refreshes current tasks before asking to remind',async()=>{expect((await remindNotification(id)).success).toContain('platform reminder');expect(m.sync).toHaveBeenCalledOnce();expect(m.rest.mock.calls[0][0]).toBe('/rest/v1/rpc/v4_remind_notification');expect(JSON.parse(m.rest.mock.calls[0][1].body)).toEqual({p_actor:actor,p_id:id});});
 it('does not claim a send when the database rejects an owner mismatch, read message or cooldown',async()=>{m.rest.mockResolvedValue(new Response('denied',{status:403}));const r=await remindNotification(id);expect(r.success).toBeUndefined();expect(r.error).toContain('your own unread');});
 it('does not write without authentication or when current messages cannot be verified',async()=>{m.session.mockRejectedValue(Error('Sign in'));await remindNotification(id);expect(m.rest).not.toHaveBeenCalled();m.session.mockResolvedValue({user:{id:actor}});m.sync.mockRejectedValue(Error('Review changed'));await remindNotification(id);expect(m.rest).not.toHaveBeenCalled();});
});
