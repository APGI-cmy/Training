import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({admin:vi.fn(),session:vi.fn(),rest:vi.fn(),certificateState:vi.fn()}));
vi.mock('@/lib/auth/require-admin',()=>({requireAdmin:m.admin}));
vi.mock('@/server/auth/session',()=>({requireSession:m.session}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
vi.mock('@/server/certificates/records',()=>({myCertificateState:m.certificateState}));
vi.mock('next/navigation',()=>({redirect:vi.fn((url:string)=>{throw new Error(`REDIRECT:${url}`)})}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import { createAdminInvitation } from '@/server/actions/invitations/create-admin-invitation';
import { createBatchInvitations } from '@/server/actions/invitations/create-batch-invitations';
import { createGroup, assignLearnerGroup } from '@/server/actions/groups';
import { issueMyCertificate, saveCertificateDesign, revokeCertificate } from '@/server/actions/certificates';
import { signCertificate, authenticCertificate } from '@/server/certificates/authentication';
import { certificateDesigns, type CertificateRecord } from '@/lib/certificates/designs';

beforeEach(()=>{vi.resetAllMocks();m.admin.mockResolvedValue({session:{user:{id:'inviter'}}});m.session.mockResolvedValue({user:{id:'owner',email_confirmed_at:'2026-01-01'}});});
afterEach(()=>vi.unstubAllEnvs());
describe('Version 2 role and certificate authority',()=>{
  const invite={recipientEmail:'person@example.invalid',role:'admin' as const,organisationId:'org',courseId:'',basis:'internal_allocation',reason:'Testing',expiresAt:'2099-01-01',confirmAdminAccess:true};
  it('requires a real administrator before creating another administrator invitation',async()=>{
    m.admin.mockRejectedValue(new Error('NOT_ADMIN'));await expect(createAdminInvitation(invite)).rejects.toThrow('NOT_ADMIN');expect(m.rest).not.toHaveBeenCalled();
  });
  it('requires explicit full-access confirmation',async()=>{
    expect(await createAdminInvitation({...invite,confirmAdminAccess:false})).toMatchObject({ok:false,error:'CONFIRM_FULL_ADMIN_ACCESS'});expect(m.rest).not.toHaveBeenCalled();
  });
  it('stores the administrator role on the invitation, never granting it before acceptance',async()=>{
    vi.stubEnv('NEXT_PUBLIC_APP_URL','https://training-platform-v2-staging.vercel.app');
    m.rest.mockImplementation(async(path:string)=>Response.json(path.startsWith('/rest/v1/organisations')?[{id:'org'}]:path.includes('?recipient_email=')?[]:[{id:'invite'}]));
    const result=await createAdminInvitation(invite);expect(result).toMatchObject({ok:true,deliveryStatus:'staging_link'});
    const row=JSON.parse(m.rest.mock.calls.find(([p])=>p==='/rest/v1/course_invitations')![1].body);
    expect(row.invited_role).toBe('admin');expect(row.course_id).toBeNull();expect(row.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(m.rest.mock.calls.some(([p])=>p.includes('user_roles'))).toBe(false);
  });
  it('rejects bulk administrator grants',async()=>{const r=await createBatchInvitations({invitations:[invite]});expect(r.sent).toBe(0);expect(r.recipientResults[0].error).toBe('ADMIN_INVITATIONS_REQUIRE_INDIVIDUAL_CONFIRMATION');});
  it.each([createGroup,assignLearnerGroup,saveCertificateDesign,revokeCertificate])('requires administrator authority for management actions',async(action)=>{m.admin.mockRejectedValue(new Error('NOT_ADMIN'));await expect(action(new FormData())).rejects.toThrow('NOT_ADMIN');expect(m.rest).not.toHaveBeenCalled();});
  it('rejects an organisation mismatch when assigning a group',async()=>{
    m.rest.mockImplementation(async(path:string)=>Response.json(path.startsWith('/rest/v1/course_enrolments')?[{organisation_id:'own'}]:[{id:'group',name:'Other',organisation_id:'other'}]));
    const f=new FormData();f.set('userId','owner');f.set('courseId','scannex-training-programme');f.set('groupId','group');await expect(assignLearnerGroup(f)).rejects.toThrow('organisation');expect(m.rest.mock.calls.some(([,init])=>init?.method==='PATCH')).toBe(false);
  });
  it('does not issue a certificate for incomplete requirements, regardless of hidden learner fields',async()=>{
    m.certificateState.mockResolvedValue({eligible:false});const f=new FormData();f.set('courseSlug','scannex-training-programme');f.set('userId','someone-else');await expect(issueMyCertificate(f)).rejects.toThrow('Complete the required');expect(m.rest).not.toHaveBeenCalled();
  });
  it('does not issue a replacement for a revoked certificate',async()=>{m.certificateState.mockResolvedValue({eligible:true,certificate:{status:'revoked'}});const f=new FormData();f.set('courseSlug','scannex-training-programme');await expect(issueMyCertificate(f)).rejects.toThrow('revoked');expect(m.rest).not.toHaveBeenCalled();});
  it('offers ten distinct named designs',()=>{expect(certificateDesigns).toHaveLength(10);expect(new Set(certificateDesigns.map(d=>d.id)).size).toBe(10);});
});
describe('Certificate authentication',()=>{
  const secret='a-private-test-secret-with-at-least-32-characters';
  const row:CertificateRecord={id:'one',certificate_number:'APGI-V2-2026-000001',user_id:'owner',course_id:'course',organisation_id:'org',issued_at:'2026-10-14T07:00:00.000Z',signature:'',status:'valid',snapshot:{name:'Sample Learner',course:'Test Course',organisation:'APGI',templateId:'classic',primary:'#10314f',secondary:'#0587a6',accent:'#9c7b30',logoPath:null,test:true,statement:'Completed'}};
  it('authenticates after PostgreSQL timestamp and JSON key normalisation',()=>{const signed={...row,signature:signCertificate(row,secret)};const reordered=Object.fromEntries(Object.entries(row.snapshot).reverse()) as typeof row.snapshot;expect(authenticCertificate({...signed,issued_at:'2026-10-14T07:00:00+00:00',snapshot:reordered},secret)).toBe(true);});
  it.each(['name','organisation','course'])('rejects tampered %s',field=>{const signed={...row,signature:signCertificate(row,secret)};expect(authenticCertificate({...signed,snapshot:{...row.snapshot,[field]:'Altered'}},secret)).toBe(false);});
  it('rejects a tampered certificate number',()=>{expect(authenticCertificate({...row,signature:signCertificate(row,secret),certificate_number:'FORGED'},secret)).toBe(false);});
  it('rejects malformed signatures and missing signing secrets',()=>{expect(authenticCertificate({...row,signature:'bad'},secret)).toBe(false);expect(()=>signCertificate(row,'short')).toThrow('not configured');});
});
