import {describe,it,expect,vi,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({company:vi.fn(),write:vi.fn(),audit:vi.fn()}));
vi.mock('@/server/auth/session',()=>({requireSession:async()=>({user:{id:'actor'}}),getSupabaseRestUrl:()=>null}));
vi.mock('@/server/services/company-structure',()=>({requireCompany:m.company,write:m.write,companyAudit:m.audit,rows:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import {companyStructureAction} from '@/server/actions/company-structure';
const id='11111111-1111-4111-8111-111111111111';
function form(){const f=new FormData();f.set('operation','watermarks');f.set('organisation_id',id);f.set('contact_email','autofill@example.com');f.set('name','Unexpected autofill');f.set('platform_watermark_kind','text');f.set('platform_watermark_text','My company');f.set('platform_watermark_opacity','7');return f;}
beforeEach(()=>{vi.clearAllMocks();m.company.mockResolvedValue({session:{user:{id:'actor'}},company:{brand_revision:7,watermarks:{},logo_path:null}});m.write.mockResolvedValue([{id}]);});
describe('Watermark-only saves cannot alter unrelated company settings',()=>{
 it('ignores autofilled contact/name fields and writes only the watermark and its revision',async()=>{const result=await companyStructureAction({},form());expect(result.success).toContain('automatically');const payload=m.write.mock.calls[0][1];expect(Object.keys(payload).sort()).toEqual(['brand_revision','watermarks']);expect(payload.brand_revision).toBe(8);expect(payload.watermarks.platform.kind).toBe('text');expect(m.audit).toHaveBeenCalledWith('actor',id,id,'company_watermarks_updated',expect.anything());});
 it('keeps the company permission check before writing',async()=>{m.company.mockRejectedValue(Error('Not authorised'));expect((await companyStructureAction({},form())).error).toContain('Not authorised');expect(m.write).not.toHaveBeenCalled();});
 it('does not change revisions for an unchanged saved watermark',async()=>{const f=form();f.set('platform_watermark_kind','none');f.set('platform_watermark_text','');expect((await companyStructureAction({},f)).success).toContain('already saved');expect(m.write).not.toHaveBeenCalled();expect(m.audit).not.toHaveBeenCalled();});
});
