import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({rest:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
vi.mock('@/server/auth/session',()=>({getSupabaseRestUrl:(p:string)=>p}));
import {getAvailableCourseIds} from '@/server/services/organisations/get-organisations';
import {getTenantCourses,getTenantPublishedCourseIds} from '@/server/services/tenant-courses';
const company='ebe89fb6-23fa-4fb1-9bfb-c525795fa3c7';
const tiger='tiger-kidnapping-telecommunications',ea='executive-assistant-lu1-compatibility',vpshr='vpshr-level-0';
const courses=[tiger,ea,vpshr];
const offerings=[{course_id:tiger,status:'published',reviewed_release_id:'approved-release'},
 {course_id:ea,status:'draft',reviewed_release_id:null},{course_id:vpshr,status:'draft',reviewed_release_id:null}];
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('ALP_ENVIRONMENT','training-production');vi.stubEnv('ALP_DEFAULT_ORGANISATION_ID',company);});
afterEach(()=>vi.unstubAllEnvs());
describe('Production learner discovery and draft preview remain separate',()=>{
 it('hides an assigned public VPSHR draft and private EA draft while retaining Tiger',async()=>{
  m.rest.mockImplementation(async(path:string)=>{
   expect(path).toContain(`organisation_id=eq.${company}`);
   expect(path).toContain('status=eq.published');expect(path).toContain('or=(reviewed_release_id.not.is.null,shared_distribution_id.not.is.null)');
   return Response.json(offerings);
  });
  expect(await getAvailableCourseIds('learner',courses)).toEqual(new Set([tiger]));
  expect(m.rest.mock.calls.some(([p])=>p.includes('course_catalogue_settings')||p.includes('organisation_course_availability'))).toBe(false);
 });
 it('retains both assigned drafts for administrator previews',async()=>{
  m.rest.mockResolvedValue(Response.json(offerings));
  expect((await getTenantCourses()).map(c=>c.id).sort()).toEqual([...courses].sort());
 });
 it('excludes published rows without an approved release and courses outside the requested list',async()=>{
  m.rest.mockResolvedValue(Response.json([...offerings,{course_id:vpshr,status:'published',reviewed_release_id:null}]));
  expect(await getAvailableCourseIds('learner',[ea,vpshr])).toEqual(new Set());
 });
 it('fails closed on a provider failure or invalid production company',async()=>{
  m.rest.mockResolvedValue(new Response('Unavailable',{status:503}));
  expect(await getAvailableCourseIds('learner',courses)).toEqual(new Set());
  vi.stubEnv('ALP_DEFAULT_ORGANISATION_ID','');
  expect(await getAvailableCourseIds('learner',courses)).toEqual(new Set());
 });
 it('leaves shared APGI V2 discovery on its existing rules',async()=>{
  vi.stubEnv('ALP_ENVIRONMENT','v2-staging');
  expect(await getTenantPublishedCourseIds()).toBeNull();expect(m.rest).not.toHaveBeenCalled();
 });
});
