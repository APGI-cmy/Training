import {beforeEach,describe,expect,it,vi} from 'vitest';
import {canSetCoursePrices,TIGER_COURSE_ID} from '@/lib/course-pricing-ownership';
import {defaultStructure,quoteStructure,ROUTES,validateStructure} from '@/lib/pricing-structures';
import {withCategoryWallet} from '@/lib/category-wallet';

const m=vi.hoisted(()=>({rows:vi.fn(),tenant:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows,write:vi.fn(),accessibleCompanies:vi.fn(),ownMemberships:vi.fn(),requireCompany:vi.fn()}));
vi.mock('@/server/services/tenant-courses',()=>({productionCompanyId:m.tenant}));
import {calculatorCourses,calculatorWalletCourses} from '@/server/services/course-calculator';
import {calculatorPlanningPreview} from '@/server/services/calculator-planning-preview';

const apgi={id:'11111111-1111-4111-8111-111111111111',slug:'apgi'};
const nks={id:'22222222-2222-4222-8222-222222222222',slug:'nks-capital'};
const mediation={id:'33333333-3333-4333-8333-333333333333',slug:'mediation-zone'};
const publicCourse='vpshr-level-0';
const testCourses=[publicCourse,TIGER_COURSE_ID];
const release='99e49830-2c2d-460e-b6df-c4a1b933b595';
beforeEach(()=>{
 vi.resetAllMocks();
 m.rows.mockImplementation(async(path:string)=>{
  if(path.includes('cc_credit_versions'))return testCourses.map(courseId=>({id:courseId+'-credits',edition_id:courseId+'-edition',owner_id:apgi.id,snapshot:{scope:'public',hours:5,currency:'USD',minimumCents:0,evidence:'Recorded workload'}}));
  if(path.includes('course_editions'))return testCourses.map(courseId=>({id:courseId+'-edition',course_id:courseId,edition_number:1,course_document:{title:courseId}}));
  if(path.includes('organisations?'))return [apgi,nks,mediation];
  if(path.includes('courses?'))return testCourses.map(id=>({id,owner_organisation_id:apgi.id}));
  if(path.includes('course_distribution?'))return path.includes(apgi.id)?[]:[{course_id:publicCourse}];
  if(path.includes('select=reviewed_release_id'))return [{reviewed_release_id:release}];
  return testCourses.map(course_id=>({course_id}));
 });
});
describe('Course-owner pricing authority',()=>{
 it('requires the partner owner or an APGI principal in their own workspace',()=>{
  expect(canSetCoursePrices('apgi',true,false)).toBe(true);
  expect(canSetCoursePrices(nks.slug,true,false)).toBe(false);
  expect(canSetCoursePrices(nks.slug,false,true)).toBe(true);
  expect(canSetCoursePrices(mediation.slug,false,false)).toBe(false);
 });
 it('limits each catalogue and wallet to owned courses, even with older credit records',async()=>{
  expect((await calculatorCourses(apgi.id)).courses.map(c=>c.courseId)).toEqual([publicCourse]);
  expect((await calculatorCourses(nks.id)).courses).toMatchObject([{courseId:TIGER_COURSE_ID,ownerId:nks.id,ownerIsApgi:false}]);
  expect((await calculatorCourses(mediation.id)).courses).toEqual([]);
  expect(await calculatorWalletCourses(mediation.id)).toEqual([]);
  expect((await calculatorWalletCourses(nks.id)).map(c=>c.courseId)).toEqual([TIGER_COURSE_ID]);
 });
 it('compares four NKS options using Tiger’s workload with only provisional record identifiers',async()=>{
  m.tenant.mockReturnValue(nks.id);
  const preview=await calculatorPlanningPreview(nks);
  expect(preview?.courses).toMatchObject([{courseId:TIGER_COURSE_ID,ownerId:nks.id,ownerIsApgi:false,hours:3.5}]);
  expect(preview?.costs[0].id).toMatch(/^estimate-/);
  expect(preview?.courses[0].editionId).toMatch(/^estimate-/);
  const {costs,courses}=preview!;
  const s=withCategoryWallet(defaultStructure(costs[0],courses,{id:nks.id,isApgi:false}),courses);
  expect(()=>validateStructure(s)).not.toThrow();
  for(const route of ROUTES){
   const q=quoteStructure(s,route,s.offers[route].minSeats);
   expect(q.result.totalCents).toBeGreaterThan(0);
   expect(q.courses[0].ownerId).toBe(nks.id);
  }
  expect(await calculatorPlanningPreview(mediation)).toBeNull();
  m.rows.mockResolvedValueOnce([{reviewed_release_id:'changed'}]);
  expect(await calculatorPlanningPreview(nks)).toBeNull();
 });
});
