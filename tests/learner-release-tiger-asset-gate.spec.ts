import {beforeEach,describe,it,expect,vi} from 'vitest';
import tiger from '@/data/tiger-kidnapping-telecommunications.json';
const m=vi.hoisted(()=>({session:vi.fn(),access:vi.fn(),edition:vi.fn(),allowed:vi.fn()}));
vi.mock('@/server/auth/session',()=>({getCurrentSession:m.session}));
vi.mock('@/server/environment-isolation',()=>({assertStagingIsolation:vi.fn()}));
vi.mock('@/server/services/tenant-courses',()=>({tenantCourseAssigned:vi.fn(),productionCompanyId:vi.fn()}));
vi.mock('@/lib/services/enrolments/get-course-access',()=>({getCourseAccess:m.access}));
vi.mock('@/server/services/course-editions',()=>({storedEdition:m.edition}));
vi.mock('@/server/services/tiger-progression',()=>({tigerUnitAllowed:m.allowed}));
import {tigerAssetAllowed} from '@/server/security/course-assets';
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({accessToken:'verified',user:{id:'learner'}});m.access.mockResolvedValue({canAccess:true,editionId:'pinned'});m.edition.mockResolvedValue({id:'pinned',runtime_course_id:tiger.id,course_document:tiger});m.allowed.mockResolvedValue(true);});
describe('Protected Tiger assets retain learner and edition gates',()=>{
 it('uses the same verified learner progression check without granting access to private tables',async()=>{
  expect(await tigerAssetAllowed('verified',tiger.id,1)).toBe(true);
  expect(m.allowed).toHaveBeenCalledWith(expect.objectContaining({user:{id:'learner'}}),expect.objectContaining({id:tiger.id,editionId:'pinned'}),expect.objectContaining({slug:'lu1'}));
 });
 it('keeps a locked later unit locked',async()=>{m.allowed.mockResolvedValue(false);expect(await tigerAssetAllowed('verified',tiger.id,2)).toBe(false);});
 it('denies a different token, unenrolled learner, incorrect edition or non-Tiger course',async()=>{
  expect(await tigerAssetAllowed('another-token',tiger.id,1)).toBe(false);expect(m.access).not.toHaveBeenCalled();
  m.access.mockResolvedValue({canAccess:false});expect(await tigerAssetAllowed('verified',tiger.id,1)).toBe(false);
  m.access.mockResolvedValue({canAccess:true,editionId:'pinned'});m.edition.mockResolvedValue({runtime_course_id:'another-course',course_document:tiger});expect(await tigerAssetAllowed('verified',tiger.id,1)).toBe(false);
  m.edition.mockResolvedValue({runtime_course_id:'another-course',course_document:{...tiger,id:'another-course'}});expect(await tigerAssetAllowed('verified','another-course',1)).toBe(false);expect(m.allowed).not.toHaveBeenCalled();
 });
 it('fails closed on missing editions or a storage outage',async()=>{m.edition.mockResolvedValue(null);expect(await tigerAssetAllowed('verified',tiger.id,1)).toBe(false);m.access.mockRejectedValue(Error('unavailable'));expect(await tigerAssetAllowed('verified',tiger.id,1)).toBe(false);});
});
