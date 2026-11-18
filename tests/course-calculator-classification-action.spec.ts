import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({access:vi.fn(),catalogue:vi.fn(),rows:vi.fn(),write:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/server/services/course-calculator',()=>({calculatorAccess:m.access,calculatorCourses:m.catalogue}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows,write:m.write}));
import {saveCourseClassification} from '@/server/actions/course-classification';
const company='11111111-1111-4111-8111-111111111111',credit='22222222-2222-4222-8222-222222222222';
const course={id:credit,editionId:'edition',ownerId:company,scope:'client',hours:8,minimumCents:5000};
function form(){const f=new FormData();f.set('company',company);f.set('credit',credit);f.set('client_name','Econet');return f;}
beforeEach(()=>{vi.resetAllMocks();m.access.mockResolvedValue({company:{id:company},principal:false,session:{user:{id:'owner'}}});m.catalogue.mockResolvedValue({courses:[course]});m.rows.mockResolvedValue([{snapshot:{hours:8,minimumCents:5000,scope:'client',evidence:'Retained workload evidence'}}]);m.write.mockResolvedValue([{id:'new-version'}]);});
describe('Versioned client and industry metadata',()=>{
 it('adds the client to a new metadata version while retaining credits, costs and ownership',async()=>{expect((await saveCourseClassification({},form())).error).toBeUndefined();expect(m.write).toHaveBeenCalledWith('/rest/v1/cc_credit_versions',{edition_id:'edition',owner_id:company,created_by:'owner',snapshot:{hours:8,minimumCents:5000,scope:'client',evidence:'Retained workload evidence',clientName:'Econet'}});});
 it('denies a different course owner even if the course is visible for resale',async()=>{m.catalogue.mockResolvedValue({courses:[{...course,ownerId:'other'}]});expect((await saveCourseClassification({},form())).error).toContain('Only the course owner');expect(m.write).not.toHaveBeenCalled();});
 it('denies stale, missing and unauthorised course records',async()=>{m.catalogue.mockResolvedValue({courses:[]});expect((await saveCourseClassification({},form())).error).toBeTruthy();expect(m.write).not.toHaveBeenCalled();});
 it('does not create an empty client label',async()=>{const f=form();f.set('client_name',' ');expect((await saveCourseClassification({},f)).error).toContain('Enter');expect(m.write).not.toHaveBeenCalled();});
 it('allows a verified principal to correct metadata without changing course ownership',async()=>{m.access.mockResolvedValue({company:{id:company},principal:true,session:{user:{id:'principal'}}});m.catalogue.mockResolvedValue({courses:[{...course,ownerId:'original-owner'}]});await saveCourseClassification({},form());expect(m.write.mock.calls[0][1].owner_id).toBe('original-owner');});
});
