import {beforeEach,describe,it,expect,vi} from 'vitest';
import course from '@/data/tiger-kidnapping-telecommunications.json';
const m=vi.hoisted(()=>({qualified:vi.fn()}));
vi.mock('@/server/services/course-editions',()=>({getMyLearningCourses:async()=>[course]}));
vi.mock('@/lib/services/enrolments/get-course-access',()=>({getCourseAccess:async()=>({status:'enrolled',canAccess:true})}));
vi.mock('@/lib/services/progress/get-learner-progress',()=>({getLearnerProgress:async()=>({completedUnitIds:new Set(course.units.slice(0,2).map(u=>u.id)),openedUnitIds:new Set(course.units.slice(0,2).map(u=>u.id)),rows:[]})}));
vi.mock('@/server/progress/progress-cookie',()=>({getCookieCompletedUnitIds:async()=>new Set(course.units.slice(0,3).map(u=>u.id))}));
vi.mock('@/server/services/tiger-progression',()=>({tigerCompletedUnits:m.qualified}));
import {getDashboard} from '@/lib/services/dashboard/get-dashboard';
const session={accessToken:'fixture',user:{id:'learner'}};
beforeEach(()=>vi.resetAllMocks());
describe('Consistent persisted Tiger progress',()=>{
 it('does not count stale results or completion cookies as qualified units',async()=>{m.qualified.mockResolvedValue(new Set());expect((await getDashboard(session)).courses[0]).toMatchObject({completedUnits:0,progressPercent:0});});
 it('updates course totals from newly qualified units and retains them on the next read',async()=>{m.qualified.mockResolvedValue(new Set(course.units.slice(0,2).map(u=>u.id)));for(let i=0;i<2;i++)expect((await getDashboard(session)).courses[0]).toMatchObject({completedUnits:2,unitCount:8,progressPercent:25});});
 it('surfaces a failed authoritative read instead of silently showing false completion',async()=>{m.qualified.mockRejectedValue(Error('offline'));await expect(getDashboard(session)).rejects.toThrow('offline');});
});
