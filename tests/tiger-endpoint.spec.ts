import {beforeEach,describe,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
import course from '@/data/tiger-kidnapping-telecommunications.json';
import {TIGER_POLICY_VERSION} from '@/lib/tiger-progression';
const mock=vi.hoisted(()=>({session:vi.fn(),course:vi.fn(),access:vi.fn(),allowed:vi.fn(),save:vi.fn()}));
vi.mock('@/server/auth/session',()=>({getCurrentSession:mock.session}));
vi.mock('@/server/services/course-editions',()=>({getLearningCourse:mock.course}));
vi.mock('@/lib/services/enrolments/get-course-access',()=>({getCourseAccess:mock.access}));
vi.mock('@/server/services/tiger-progression',()=>({tigerUnitAllowed:mock.allowed,saveTigerEvidence:mock.save}));
import {PUT,GET} from '../app/api/tiger-progress/route';
function request(extra:Record<string,unknown>={},origin='https://training-platform-v2-staging.vercel.app'){
 return new NextRequest('https://training-platform-v2-staging.vercel.app/api/tiger-progress',{method:'PUT',headers:{origin,'content-type':'application/json'},body:JSON.stringify({courseSlug:course.slug,unitSlug:'lu1',edition:'legacy',version:TIGER_POLICY_VERSION,...extra})});
}
describe('Tiger authenticated progress endpoint',()=>{
 beforeEach(()=>{vi.resetAllMocks();mock.session.mockResolvedValue({accessToken:'fixture',user:{id:'actual-user'}});mock.course.mockResolvedValue(course);mock.access.mockResolvedValue({canAccess:true});mock.allowed.mockResolvedValue(true);mock.save.mockResolvedValue({state:{},qualified:false});});
 it('rejects anonymous access and expired/revoked enrolment without writing evidence',async()=>{
  mock.session.mockResolvedValue(null);expect((await PUT(request())).status).toBe(403);expect(mock.save).not.toHaveBeenCalled();
  mock.session.mockResolvedValue({accessToken:'fixture',user:{id:'actual-user'}});mock.access.mockResolvedValue({canAccess:false});expect((await PUT(request())).status).toBe(403);expect(mock.save).not.toHaveBeenCalled();
 });
 it('rejects cross-origin writes and wrong edition/policy bindings',async()=>{
  expect((await PUT(request({},'https://unrelated.invalid'))).status).toBe(403);
  expect((await PUT(request({version:'old'}))).status).toBe(409);
  expect((await PUT(request({edition:'another-edition'}))).status).toBe(403);expect(mock.save).not.toHaveBeenCalled();
 });
 it('uses the signed-in learner and never accepts a client quiz-pass claim',async()=>{
  expect((await PUT(request({user_id:'another-user',attempt:{success_status:'passed'},quiz_passed:true}))).status).toBe(200);
  const [session,,,evidence]=mock.save.mock.calls[0];expect(session.user.id).toBe('actual-user');expect(evidence.attempt).toBeUndefined();
 });
 it('blocks a direct later-unit request before storing anything',async()=>{
  mock.allowed.mockResolvedValue(false);expect((await PUT(request({unitSlug:'lu2'}))).status).toBe(403);expect(mock.save).not.toHaveBeenCalled();
 });
 it('fails closed if saved requirements cannot be loaded',async()=>{
  mock.save.mockRejectedValue(Error('offline'));
  expect((await GET(new NextRequest(`https://training-platform-v2-staging.vercel.app/api/tiger-progress?courseSlug=${course.slug}&unitSlug=lu1`))).status).toBe(503);
 });
});
