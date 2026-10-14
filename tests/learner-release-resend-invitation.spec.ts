import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({admin:vi.fn(),rest:vi.fn(),deliver:vi.fn()}));
vi.mock('@/lib/auth/require-admin',()=>({requireAdmin:m.admin}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
vi.mock('@/server/services/invitations/deliver-stored-invitation',()=>({deliverStoredInvitation:m.deliver}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import {resendInvitation} from '@/server/actions/invitations/resend-invitation';
const id='3ef51f8e-529d-49ed-8896-7e8564e67816';
const row={id,recipient_email:'invited@example.com',invited_role:'admin',course_id:null,organisation_id:'org',expires_at:'2099-01-01',status:'pending',revoked_at:null,redeemed_at:null,token_hash:'oldhash'};
function form(){const f=new FormData();f.set('invitationId',id);f.set('recipientEmail','forged@example.com');return f;}
beforeEach(()=>{vi.resetAllMocks();m.admin.mockResolvedValue({session:{user:{id:'real-admin'}}});m.deliver.mockResolvedValue({ok:true,deliveryStatus:'sent'});m.rest.mockImplementation(async (p:string,init?:RequestInit)=>Response.json(p.startsWith('/rest/v1/organisations?')?[{id:'org'}]:p.startsWith('/rest/v1/course_invitation_events?')?[]:init?.method==='PATCH'?[{id}]:p.startsWith('/rest/v1/course_invitations?')?[row]:[]));});
describe('Invitation email resend',()=>{
 it('requires a signed-in administrator before reading or sending an invitation',async()=>{m.admin.mockRejectedValue(new Error('NOT_ADMIN'));await expect(resendInvitation({ok:false},form())).rejects.toThrow('NOT_ADMIN');expect(m.rest).not.toHaveBeenCalled();expect(m.deliver).not.toHaveBeenCalled();});
 it('uses the stored recipient and role, rotates the old link, and never grants a role while sending',async()=>{expect(await resendInvitation({ok:false},form())).toMatchObject({ok:true,deliveryStatus:'sent'});expect(m.deliver).toHaveBeenCalledWith(expect.objectContaining({recipientEmail:'invited@example.com',role:'admin',actorId:'real-admin'}));const claim=m.rest.mock.calls.find(([,init])=>init?.method==='PATCH');expect(claim![0]).toContain('token_hash=eq.oldhash');expect(JSON.parse(claim![1].body).token_hash).toMatch(/^[a-f0-9]{64}$/);expect(m.rest.mock.calls.some(([p])=>p.includes('user_roles'))).toBe(false);});
 it.each([{status:'revoked'},{redeemed_at:'2026-01-01'},{expires_at:'2020-01-01'}])('rejects an inactive invitation %j',async override=>{m.rest.mockResolvedValue(Response.json([{...row,...override}]));expect(await resendInvitation({ok:false},form())).toMatchObject({ok:false,error:'INVITATION_NOT_ACTIVE'});expect(m.deliver).not.toHaveBeenCalled();});
 it('throttles immediate repeats',async()=>{m.rest.mockImplementation(async(p:string)=>Response.json(p.startsWith('/rest/v1/organisations?')?[{id:'org'}]:p.startsWith('/rest/v1/course_invitation_events?')?[{id:'recent'}]:[row]));expect(await resendInvitation({ok:false},form())).toMatchObject({ok:false,error:'WAIT_ONE_MINUTE_BEFORE_RESENDING'});expect(m.deliver).not.toHaveBeenCalled();});
 it('does not send when another request already rotated the link',async()=>{m.rest.mockImplementation(async(p:string,init?:RequestInit)=>Response.json(init?.method==='PATCH'?[]:p.startsWith('/rest/v1/organisations?')?[{id:'org'}]:p.startsWith('/rest/v1/course_invitation_events?')?[]:[row]));expect(await resendInvitation({ok:false},form())).toMatchObject({ok:false,error:'INVITATION_CHANGED_TRY_AGAIN'});expect(m.deliver).not.toHaveBeenCalled();});
});
