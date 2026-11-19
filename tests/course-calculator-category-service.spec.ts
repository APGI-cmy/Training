import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({rows:vi.fn(),tenant:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows,write:vi.fn(),accessibleCompanies:vi.fn(),ownMemberships:vi.fn(),requireCompany:vi.fn()}));
vi.mock('@/server/services/tenant-courses',()=>({productionCompanyId:m.tenant}));
import {calculatorCourses} from '@/server/services/course-calculator';
const owner='11111111-1111-4111-8111-111111111111';
const snapshot={scope:'industry',title:'Industry course',hours:8,currency:'USD',minimumCents:100,evidence:'Verified workload'};
beforeEach(()=>{vi.resetAllMocks();m.rows.mockImplementation(async(path:string)=>path.includes('course_distribution?')?[]:path.includes('cc_credit_versions')?[{id:'a',edition_id:'ea',owner_id:owner,snapshot},{id:'b',edition_id:'eb',owner_id:owner,snapshot:{...snapshot,scope:'client',clientName:'Recorded client'}}]:path.includes('course_editions')?[{id:'ea',course_id:'a',edition_number:1,course_document:{title:'A',classification:{category:'industry',industry:'Mining'}}},{id:'eb',course_id:'b',edition_number:1,course_document:{title:'B'}}]:path.includes('organisations?')?[{id:owner,slug:'owner',name:'Owner'}]:[{course_id:'a'}]);});
describe('Authorised calculator metadata',()=>{
 it('reads the uploaded industry and recorded client labels',async()=>{m.tenant.mockReturnValue(null);expect((await calculatorCourses(owner,true)).courses).toMatchObject([{industry:'Mining'},{clientName:'Recorded client'}]);});
 it('keeps unassigned courses out of a dedicated production tenant even for a principal',async()=>{m.tenant.mockReturnValue(owner);expect((await calculatorCourses(owner,true)).courses.map(c=>c.courseId)).toEqual(['a']);});
 it('does not infer a missing client from the seller or silently reassign a course',async()=>{m.rows.mockImplementation(async(path:string)=>path.includes('course_distribution?')?[]:path.includes('cc_credit_versions')?[{id:'a',edition_id:'ea',owner_id:owner,snapshot:{...snapshot,scope:'client'}}]:path.includes('course_editions')?[{id:'ea',course_id:'a',edition_number:1,course_document:{title:'A'}}]:path.includes('organisations?')?[{id:owner,slug:'owner',name:'Owner'}]:[]);expect((await calculatorCourses(owner,true)).courses[0].clientName).toBeUndefined();});
});
