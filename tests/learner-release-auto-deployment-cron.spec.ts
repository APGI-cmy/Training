import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({sync:vi.fn(),mail:vi.fn(),rows:vi.fn(),queue:vi.fn()}));
vi.mock('@/server/services/course-deployments',()=>({synchronizeCourseDeployments:m.sync}));
vi.mock('@/server/services/course-reviews',()=>({processReviewMail:m.mail}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows}));
vi.mock('@/server/services/review-nonresponse',()=>({queueReviewResponseRequests:m.queue}));
import {GET} from '../app/api/cron/course-deployments/route';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('CRON_SECRET','test-only');m.rows.mockResolvedValue([]);m.queue.mockResolvedValue(0);});
afterEach(()=>vi.unstubAllEnvs());
const request=(auth='Bearer test-only')=>new Request('https://example.com/api/cron/course-deployments',{headers:{authorization:auth}});
describe('Deployment registration schedule',()=>{
 it('does not allow an anonymous browser to run the job',async()=>{expect((await GET(request(''))).status).toBe(401);expect(m.sync).not.toHaveBeenCalled();});
 it('dispatches durable notices only after registration',async()=>{m.sync.mockResolvedValue({confirmed:true,registered:1,baselined:0,deferred:0});expect((await GET(request())).status).toBe(200);expect(m.mail).toHaveBeenCalledTimes(1);});
 it('does not send duplicate notices for a baseline or already registered version',async()=>{m.sync.mockResolvedValue({confirmed:true,registered:0,baselined:1,deferred:0});expect((await GET(request())).status).toBe(200);expect(m.mail).not.toHaveBeenCalled();});
 it('links new response requests even when the course deployment has not changed',async()=>{m.sync.mockResolvedValue({confirmed:true,registered:0,baselined:0,deferred:0});m.queue.mockResolvedValue(4);const r=await GET(request());expect(r.status).toBe(200);expect((await r.json()).responseRequestsQueued).toBe(4);expect(m.mail).toHaveBeenCalledTimes(1);});
 it.each([{confirmed:false,registered:0,deferred:0},{confirmed:true,registered:0,deferred:1}])('returns a retryable failure when proof or registration is pending',async(result)=>{m.sync.mockResolvedValue(result);expect((await GET(request())).status).toBe(503);expect(m.mail).not.toHaveBeenCalled();});
});
