import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({admin:vi.fn(),company:vi.fn(),write:vi.fn(),audit:vi.fn(),revalidate:vi.fn()}));
vi.mock('@/lib/auth/require-admin',()=>({requireAdmin:mocks.admin}));
vi.mock('@/server/services/company-structure',()=>({requireCompany:mocks.company,write:mocks.write,companyAudit:mocks.audit}));
vi.mock('next/cache',()=>({revalidatePath:mocks.revalidate}));
import {saveCertificateDesign} from '@/server/actions/certificates';
const company={id:'11111111-1111-4111-8111-111111111111',certificate_template_id:'executive',brand_revision:3,logo_path:'controlled.png',watermarks:{platform:{kind:'text',text:'Existing platform mark',opacity:.05},certificate:{kind:'none',text:'',opacity:.07}}};
function form(){const f=new FormData();f.set('organisationId',company.id);f.set('templateId','executive');f.set('certificate_watermark_kind','text');f.set('certificate_watermark_text','NKS CAPITAL');f.set('certificate_watermark_opacity','7');return f;}
beforeEach(()=>{vi.clearAllMocks();mocks.admin.mockResolvedValue({});mocks.company.mockResolvedValue({session:{user:{id:'actor'}},company});mocks.write.mockResolvedValue([{id:company.id}]);});
describe('Watermark save permissions and exact branding revisions',()=>{
 it('saves certificate settings without replacing the platform watermark',async()=>{await saveCertificateDesign(form());expect(mocks.write).toHaveBeenCalledWith(expect.stringContaining('brand_revision=eq.3'),expect.objectContaining({brand_revision:4,watermarks:{platform:company.watermarks.platform,certificate:{kind:'text',text:'NKS CAPITAL',opacity:.07}}}),'PATCH');expect(mocks.audit).toHaveBeenCalled();});
 it('rejects unauthorised saves before writing',async()=>{mocks.admin.mockRejectedValueOnce(Error('Admin required'));await expect(saveCertificateDesign(form())).rejects.toThrow();expect(mocks.write).not.toHaveBeenCalled();});
 it('fails a stale save rather than claiming that a concurrent update succeeded',async()=>{mocks.write.mockResolvedValue([]);await expect(saveCertificateDesign(form())).rejects.toThrow('brand changed');expect(mocks.audit).not.toHaveBeenCalled();});
});
