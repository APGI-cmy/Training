import {beforeEach,describe,it,expect,vi} from 'vitest';
import course from '@/data/tiger-kidnapping-telecommunications.json';
const m=vi.hoisted(()=>({rest:vi.fn(),completed:vi.fn(),course:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
vi.mock('@/server/auth/session',()=>({requireSession:async()=>({user:{id:'learner'}})}));
vi.mock('@/server/services/course-editions',()=>({getLearningCourse:m.course}));
vi.mock('@/server/services/tiger-progression',()=>({tigerCompletedUnits:m.completed}));
import {myCertificateState} from '@/server/certificates/records';
beforeEach(()=>{vi.resetAllMocks();m.course.mockResolvedValue(course);m.rest.mockImplementation(async(path:string)=>Response.json(path.includes('v2_certificate_eligible')?true:[]));});
describe('Genuine Tiger certificates require persisted qualification',()=>{
 it('does not issue on SCORM eligibility alone if any Tiger unit remains unqualified',async()=>{m.completed.mockResolvedValue(new Set(['lu1']));expect((await myCertificateState(course.id)).eligible).toBe(false);});
 it('allows eligibility when all units and the existing completion policy pass',async()=>{m.completed.mockResolvedValue(new Set(course.units.map(u=>u.id)));expect((await myCertificateState(course.id)).eligible).toBe(true);});
 it('fails closed if saved prerequisite records cannot be read',async()=>{m.completed.mockRejectedValue(Error('offline'));await expect(myCertificateState(course.id)).rejects.toThrow('offline');});
});
