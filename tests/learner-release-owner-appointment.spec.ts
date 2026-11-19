import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({principal:vi.fn(),company:vi.fn(),rows:vi.fn(),write:vi.fn(),deliver:vi.fn()}));
const id='ebe89fb6-23fa-4fb1-9bfb-c525795fa3c7';
vi.mock('@/server/services/tenant-courses',()=>({productionCompanyId:()=>id}));
vi.mock('@/server/auth/session',()=>({requireSession:async()=>({user:{id:'principal'}}),getSupabaseRestUrl:()=>''}));
vi.mock('@/server/services/platform-principals',()=>({requirePlatformPrincipal:m.principal}));
vi.mock('@/server/services/company-structure',()=>({requireCompany:m.company,rows:m.rows,write:m.write,companyAudit:vi.fn()}));
vi.mock('@/server/services/invitations/deliver-stored-invitation',()=>({deliverStoredInvitation:m.deliver}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import {companyStructureAction} from '@/server/actions/company-structure';
const form=()=>{const f=new FormData();f.set('operation','invite_owner');f.set('organisation_id',id);f.set('owner_email','tshepo@nkscapital.co.za');return f;};
beforeEach(()=>{vi.resetAllMocks();m.company.mockResolvedValue({isAdmin:true,session:{user:{id:'principal'}},company:{id}});m.principal.mockResolvedValue({session:{user:{id:'principal'}}});m.rows.mockImplementation(async(path:string)=>path.includes('/organisations?')?[{slug:'nks-capital'}]:[]);m.write.mockResolvedValue([]);m.deliver.mockResolvedValue({ok:true});});
describe('Production owner appointments',()=>{
 it('prepares only a company-owner invitation after the production company guard and principal check',async()=>{
  expect(await companyStructureAction({},form())).toMatchObject({success:'Company-owner invitation prepared.'});
  expect(m.company).toHaveBeenCalledWith(id);
  expect(m.write.mock.calls[0]).toEqual(['/rest/v1/course_invitations',expect.objectContaining({organisation_id:id,invited_role:'business_owner',recipient_email:'tshepo@nkscapital.co.za',course_id:null})]);
  expect(m.deliver).toHaveBeenCalledOnce();
 });
 it('rejects a partner administrator who is not a platform principal before creating an invitation',async()=>{
  m.principal.mockRejectedValue(Error('Principal required'));
  expect(await companyStructureAction({},form())).toMatchObject({error:'Principal required'});
  expect(m.rows).not.toHaveBeenCalled();expect(m.write).not.toHaveBeenCalled();expect(m.deliver).not.toHaveBeenCalled();
 });
 it('does not bypass the native-company boundary or resend an existing owner request',async()=>{
  m.company.mockRejectedValueOnce(Error('Different production company'));
  expect(await companyStructureAction({},form())).toMatchObject({error:'Different production company'});
  expect(m.principal).not.toHaveBeenCalled();expect(m.deliver).not.toHaveBeenCalled();
  m.rows.mockImplementation(async(path:string)=>path.includes('/organisations?')?[{slug:'nks-capital'}]:[{id:'existing'}]);
  expect((await companyStructureAction({},form())).error).toContain('active owner invitation');
  expect(m.write).not.toHaveBeenCalled();expect(m.deliver).not.toHaveBeenCalled();
 });
});
