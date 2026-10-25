import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({managed:vi.fn(),check:vi.fn(),rpc:vi.fn(),rest:vi.fn(),resend:vi.fn(),recovery:vi.fn(),deliver:vi.fn(),revalidate:vi.fn()}));
vi.mock('@/server/services/mail-management',()=>({managedMail:m.managed,checkMailDelivery:m.check}));
vi.mock('@/server/services/messages',()=>({messageRpc:m.rpc}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
vi.mock('@/server/actions/invitations/resend-invitation',()=>({resendInvitation:m.resend}));
vi.mock('@/server/actions/auth/password-recovery',()=>({requestPasswordRecovery:m.recovery}));
vi.mock('@/server/services/email/transactional-delivery',()=>({deliverTransactionalEmail:m.deliver}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
import {mailManagementAction} from '@/server/actions/mail-management';
const id='00000000-0000-4000-8000-000000000001',source='00000000-0000-4000-8000-000000000002';
const row={id,message_key:'invitation:'+source,organisation_id:null,source_id:source,category:'admin_invitation',recipient:'original@example.com',subject:'Invitation'};
function form(operation:string){const f=new FormData();f.set('id',id);f.set('operation',operation);return f;}
beforeEach(()=>{vi.resetAllMocks();m.managed.mockResolvedValue({session:{user:{id:'actor'}},detail:{attempts:[],events:[],followups:[]},row});m.rpc.mockResolvedValue({...row,html:null,body:null});m.resend.mockResolvedValue({ok:true,deliveryStatus:'sent'});m.recovery.mockResolvedValue({message:'Requested'});});
describe('Email management authority and resends',()=>{
 it('rejects a foreign email before checking, editing or resending it',async()=>{m.managed.mockRejectedValue(Error('Email unavailable'));for(const op of ['detail','check','followup','resend'])expect(await mailManagementAction({},form(op))).toEqual({error:'Email unavailable'});expect(m.deliver).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();expect(m.check).not.toHaveBeenCalled();});
 it('resends only the stored invitation and never accepts a replacement recipient',async()=>{const f=form('resend');f.set('recipient','attacker@example.com');expect((await mailManagementAction({},f)).success).toContain('original recipient');expect(m.resend.mock.calls[0][1].get('invitationId')).toBe(source);expect(m.resend.mock.calls[0][1].get('recipient')).toBeNull();expect(m.deliver).not.toHaveBeenCalled();});
 it('does not send after a throttled or ineligible resend claim',async()=>{m.rpc.mockRejectedValue(Error('Please wait one minute before resending'));expect((await mailManagementAction({},form('resend'))).error).toContain('wait one minute');expect(m.resend).not.toHaveBeenCalled();});
 it('requests fresh account help rather than replaying a saved confirmation link',async()=>{m.managed.mockResolvedValue({session:{user:{id:'actor'}},detail:{attempts:[]},row:{...row,category:'account_confirmation'}});expect((await mailManagementAction({},form('resend'))).success).toContain('Old private links are never copied');expect(m.recovery.mock.calls[0][1].get('email')).toBe('original@example.com');expect(m.deliver).not.toHaveBeenCalled();});
 it('saves follow-up notes without sending an email',async()=>{const f=form('followup');f.set('state','waiting');f.set('note','Awaiting confirmation');expect((await mailManagementAction({},f)).success).toBe('Follow-up saved.');expect(m.rpc).toHaveBeenCalledWith('v2_mail_manage',expect.objectContaining({p_actor:'actor',p_action:'followup',p_state:'waiting'}));expect(m.resend).not.toHaveBeenCalled();expect(m.deliver).not.toHaveBeenCalled();});
 it('does not report a resend if the original invitation is expired',async()=>{m.resend.mockResolvedValue({ok:false,error:'INVITATION_NOT_ACTIVE'});expect((await mailManagementAction({},form('resend'))).error).toContain('cannot be resent');});
});
