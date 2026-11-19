import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({access:vi.fn(),members:vi.fn(),principal:vi.fn(),rows:vi.fn(),rest:vi.fn(),content:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({requireCompanyForSession:m.access,ownMemberships:m.members,rows:m.rows}));
vi.mock('@/server/services/platform-principals',()=>({isPlatformPrincipal:m.principal}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
vi.mock('@/server/services/course-reviews',()=>({contentSource:m.content}));
vi.mock('@/lib/courses',()=>({getCourseBySlug:(id:string)=>id==='vpshr-level-0'?{id,title:'VPSHR Level 0'}:null}));
import {courseSharingWorkspace,requireCourseSharingOwner} from '@/server/services/course-sharing';
import {offerCourse} from '@/server/services/course-distribution';
import type {AlpSession} from '@/server/auth/session';
const owner='11111111-1111-4111-8111-111111111111',recipient='22222222-2222-4222-8222-222222222222',release='33333333-3333-4333-8333-333333333333';
const session={user:{id:'verified-actor'},accessToken:'test-only'} as AlpSession;
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('VERCEL_PROJECT_ID','prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf');m.access.mockResolvedValue({company:{id:owner,slug:'apgi'}});m.principal.mockResolvedValue(true);m.members.mockResolvedValue([]);m.content.mockResolvedValue({fingerprint:'exact-published-fingerprint'});m.rest.mockResolvedValue(Response.json('private-shelf-id'));m.rows.mockImplementation(async(path:string)=>path.startsWith('/rest/v1/organisations?')?[{slug:'nks-capital'}]:path.startsWith('/rest/v1/organisation_offerings?')?[{reviewed_release_id:release}]:path.startsWith('/rest/v1/course_review_rounds?')?[{fingerprint:'exact-published-fingerprint'}]:[]);});
afterEach(()=>vi.unstubAllEnvs());
describe('Owner-controlled published course sharing',()=>{
 it('lists only owned, actually published owner releases, never drafts or foreign courses',async()=>{
  m.rows.mockImplementation(async(path:string)=>{
   if(path.startsWith('/rest/v1/courses?'))return [{id:'vpshr-level-0'}];
   if(path.startsWith('/rest/v1/organisation_offerings?'))return [{course_id:'vpshr-level-0',reviewed_release_id:release},{course_id:'foreign-private',reviewed_release_id:release}];
   if(path.startsWith('/rest/v1/course_review_rounds?'))return [{id:release,course_id:'vpshr-level-0',status:'published'}];
   if(path.startsWith('/rest/v1/organisations?'))return [{id:owner,name:'Owner'},{id:recipient,name:'Recipient'}];
   return [];
  });
  const data=await courseSharingWorkspace(owner,session);expect(data.courses).toEqual([{id:'vpshr-level-0',title:'VPSHR Level 0'}]);expect(data.companies).toEqual([{id:recipient,name:'Recipient'}]);
 });
 it('does not let platform administration substitute for a client course owner',async()=>{m.access.mockResolvedValue({company:{id:owner,slug:'nks-capital'}});await expect(requireCourseSharingOwner(owner,session)).rejects.toThrow('Only the declared course owner');expect(m.rest).not.toHaveBeenCalled();});
 it('requires APGI principal authority for an APGI-owned course',async()=>{m.principal.mockResolvedValue(false);await expect(requireCourseSharingOwner(owner,session)).rejects.toThrow('Only the declared course owner');});
 it('creates a private shelf offer using the server session actor rather than publishing a recipient offering',async()=>{await offerCourse({course:'vpshr-level-0',owner,recipient,reason:'Offer this published owner release'},session);expect(m.rest.mock.calls[0][0]).toBe('/rest/v1/rpc/v6_offer_course');expect(JSON.parse(m.rest.mock.calls[0][1].body)).toMatchObject({p_actor:'verified-actor',p_owner:owner,p_recipient:recipient,p_project:'prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf'});expect(m.rest.mock.calls).toHaveLength(1);});
 it('refuses a deployed course that differs from the owner-published fingerprint',async()=>{m.content.mockResolvedValue({fingerprint:'changed-draft'});await expect(offerCourse({course:'vpshr-level-0',owner,recipient,reason:'Offer this published owner release'},session)).rejects.toThrow('differs from its owner-published');expect(m.rest).not.toHaveBeenCalled();});
 it('refuses an owner decision from the wrong deployment',async()=>{m.access.mockResolvedValue({company:{id:owner,slug:'nks-capital'}});m.members.mockResolvedValue([{organisation_id:owner}]);await expect(offerCourse({course:'vpshr-level-0',owner,recipient,reason:'Offer this published owner release'},session)).rejects.toThrow('registered platform');expect(m.rest).not.toHaveBeenCalled();});
 it('does not report success when the database rejects an owner decision',async()=>{m.rest.mockResolvedValue(new Response('',{status:403}));await expect(offerCourse({course:'vpshr-level-0',owner,recipient,reason:'Offer this published owner release'},session)).rejects.toThrow('Sharing could not be updated');});
});
