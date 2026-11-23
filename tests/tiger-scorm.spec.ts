import {beforeEach,describe,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
import course from '@/data/tiger-kidnapping-telecommunications.json';
import {emptyTigerProgress} from '@/lib/tiger-progression';
const mock=vi.hoisted(()=>({session:vi.fn(),access:vi.fn(),allowed:vi.fn(),evidence:vi.fn(),fetch:vi.fn(),progress:vi.fn()}));
vi.mock('@/server/auth/session',()=>({getCurrentSession:mock.session,getSupabaseRestUrl:(path:string)=>`https://eaaqgtdpvbxdgjxphjie.supabase.co${path}`}));
vi.mock('@/server/services/course-editions',()=>({getLearningCourse:async()=>course}));
vi.mock('@/lib/services/enrolments/get-course-access',()=>({getCourseAccess:mock.access}));
vi.mock('@/server/services/tiger-progression',()=>({tigerUnitAllowed:mock.allowed,saveTigerEvidence:mock.evidence}));
vi.mock('@/server/security/provider-fetch',()=>({providerFetch:mock.fetch}));
vi.mock('@/server/progress/record-progress',()=>({recordProgressForSession:mock.progress}));
import {GET,PUT} from '../app/api/scorm/route';
const origin='https://training-platform-v2-staging.vercel.app';
const attempt={completion_status:'completed',success_status:'passed',score_scaled:.9,interactions:{'cmi.interactions.0.learner_response':'original answer'}};
function request(){return new NextRequest(origin+'/api/scorm',{method:'PUT',headers:{origin,'content-type':'application/json'},body:JSON.stringify({courseSlug:course.slug,unitSlug:'lu1',attempt})});}
describe('Tiger SCORM result retention and qualification',()=>{
 beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','fixture');mock.session.mockResolvedValue({accessToken:'fixture',user:{id:'actual-user'}});mock.access.mockResolvedValue({canAccess:true});mock.allowed.mockResolvedValue(true);mock.evidence.mockResolvedValue({state:emptyTigerProgress(),qualified:false});mock.fetch.mockImplementation(async(_url:string,options?:RequestInit)=>options?.method==='POST'?Response.json([]):Response.json([{completed_at:'2026-10-01T00:00:00Z',passed_at:'2026-10-01T00:00:00Z'}]));});
 it('retains real quiz answers, score and prior timestamps while withholding premature unit completion',async()=>{
  expect((await PUT(request())).status).toBe(200);
  const [,options]=mock.fetch.mock.calls.find(([,o])=>o?.method==='POST')!;
  const saved=JSON.parse(options.body);
  expect(saved).toMatchObject({user_id:'actual-user',completion_status:'incomplete',success_status:'passed',score_scaled:.9,interactions:attempt.interactions,completed_at:'2026-10-01T00:00:00Z',passed_at:'2026-10-01T00:00:00Z'});
  expect(mock.progress).not.toHaveBeenCalled();
 });
 it('records qualified completion only after attempt storage and requires durable progress storage',async()=>{
  mock.evidence.mockResolvedValue({state:{...emptyTigerProgress(),qualified_at:'2026-11-15T00:00:00Z'},qualified:true});
  expect((await PUT(request())).status).toBe(200);
  expect(mock.progress).toHaveBeenCalledWith(expect.objectContaining({requirePersistence:true,eventType:'unit_completed'}));
  const postIndex=mock.fetch.mock.calls.findIndex(([,o])=>o?.method==='POST');
  expect(mock.fetch.mock.invocationCallOrder[postIndex]).toBeLessThan(mock.progress.mock.invocationCallOrder[0]);
 });
 it('leaves prior results untouched when evidence storage is unavailable',async()=>{
  mock.evidence.mockRejectedValue(Error('offline'));
  expect((await PUT(request())).status).toBe(503);expect(mock.fetch).not.toHaveBeenCalled();expect(mock.progress).not.toHaveBeenCalled();
 });
 it('never grants quiz qualification if the assessment answers could not be stored',async()=>{
  mock.fetch.mockImplementation(async(_url:string,options?:RequestInit)=>options?.method==='POST'?new Response('offline',{status:500}):Response.json([]));
  expect((await PUT(request())).status).toBe(500);
  expect(mock.evidence).toHaveBeenCalledTimes(1);
  expect(mock.evidence.mock.calls[0][3]).toEqual({});
  expect(mock.progress).not.toHaveBeenCalled();
 });
 it('does not turn an unreadable saved attempt into an empty new attempt',async()=>{
  mock.fetch.mockResolvedValue(new Response('offline',{status:503}));
  expect((await GET(new NextRequest(origin+`/api/scorm?courseSlug=${course.slug}&unitSlug=lu1`))).status).toBe(503);
 });
 it('denies direct later-unit writes before accepting a quiz result',async()=>{
  mock.allowed.mockResolvedValue(false);expect((await PUT(request())).status).toBe(401);expect(mock.evidence).not.toHaveBeenCalled();expect(mock.fetch).not.toHaveBeenCalled();
 });
 it('identifies the owner of loaded progress and rejects a retry under a different learner',async()=>{
  const read=await GET(new NextRequest(origin+`/api/scorm?courseSlug=${course.slug}&unitSlug=lu1`));
  expect((await read.json()).learnerId).toBe('actual-user');mock.fetch.mockClear();
  const r=await PUT(new NextRequest(origin+'/api/scorm',{method:'PUT',headers:{origin,'content-type':'application/json'},body:JSON.stringify({courseSlug:course.slug,unitSlug:'lu1',expectedLearnerId:'original-learner',attempt})}));
  expect(r.status).toBe(409);expect((await r.json()).code).toBe('learner_changed');expect(mock.fetch).not.toHaveBeenCalled();expect(mock.evidence).not.toHaveBeenCalled();
 });
});
