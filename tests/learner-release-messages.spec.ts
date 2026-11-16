import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),rpc:vi.fn(),attachment:vi.fn(),flush:vi.fn(),revalidate:vi.fn()}));
vi.mock('@/server/services/notifications',()=>({notificationSession:m.session}));
vi.mock('@/server/services/messages',()=>({messageRpc:m.rpc,messageAttachment:m.attachment,flushMessageMail:m.flush}));
vi.mock('next/cache',()=>({revalidatePath:m.revalidate}));
import {messageAction} from '@/server/actions/messages';
import {parseRecipients,sastInput} from '@/lib/messages';
import {notificationTarget,notificationStatus,type PersonalNotification} from '@/lib/notifications';
const actor='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
function form(op='send'){const f=new FormData();Object.entries({operation:op,user_id:'forged',message_id:id,organisation_id:id,subject:'Subject',body:'Message',to:'JORRIE@EXAMPLE.COM'}).forEach(([k,v])=>f.set(k,v));return f;}
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:actor,email_confirmed_at:'today'}});m.rpc.mockResolvedValue(id);m.attachment.mockResolvedValue(null);m.flush.mockResolvedValue({accepted:1});});
describe('Messages authorization and durable delivery',()=>{
 it('uses verified identity, normalizes recipient and preserves the client idempotency key',async()=>{expect((await messageAction({},form())).threadId).toBe(id);expect(m.rpc.mock.calls[0]).toEqual(['v2_message_send',expect.objectContaining({p_actor:actor,p_id:id,p_to:'jorrie@example.com'})]);expect(m.rpc.mock.calls[0][1].user_id).toBeUndefined();});
 it('keeps a saved message successful when email temporarily fails',async()=>{m.flush.mockRejectedValue(Error('network'));expect((await messageAction({},form())).success).toContain('queued for retry');});
 it('does not send email after the database rejects the recipient',async()=>{m.rpc.mockRejectedValue(Error('outside your administrative scope'));expect((await messageAction({},form())).error).toContain('scope');expect(m.flush).not.toHaveBeenCalled();});
 it('does not write when the verified session fails',async()=>{m.session.mockRejectedValue(Error('Sign in'));expect((await messageAction({},form())).error).toBe('Sign in');expect(m.rpc).not.toHaveBeenCalled();});
 it('stops an invalid attachment before any message is committed',async()=>{m.attachment.mockRejectedValue(Error('Attach a PDF'));expect((await messageAction({},form())).error).toBe('Attach a PDF');expect(m.rpc).not.toHaveBeenCalled();});
 it('makes escalation a checked request before queuing a team update',async()=>{const f=form('escalate');f.set('thread_id',id);await messageAction({},f);expect(m.rpc.mock.calls[0]).toEqual(['v2_message_manage',{p_actor:actor,p_thread:id,p_operation:'escalate'}]);expect(m.rpc.mock.calls[1][0]).toBe('v2_message_send');});
 it('does not escalate after a permission refusal',async()=>{m.rpc.mockRejectedValue(Error('Only the first-level administrator'));const f=form('escalate');f.set('thread_id',id);await messageAction({},f);expect(m.rpc).toHaveBeenCalledOnce();expect(m.flush).not.toHaveBeenCalled();});
 it.each(['close','reopen'])('confirms %s and refreshes the conversation after a void database response',async op=>{m.rpc.mockResolvedValue(undefined);const f=form(op);f.set('thread_id',id);const result=await messageAction({},f);expect(result.error).toBeUndefined();expect(result.success).toBe(`Conversation ${op==='close'?'closed':'reopened'}.`);expect(m.revalidate).toHaveBeenCalledWith('/messages','layout');expect(m.flush).not.toHaveBeenCalled();});
 it('saves explicit scoped recipients and converts SAST schedule times to UTC',async()=>{const f=form('schedule');f.set('recipients','One@example.com;two@example.com');f.set('cadence','weekly');f.set('start','2026-10-22T10:30');f.set('end','2026-11-22T10:30');await messageAction({},f);expect(m.rpc).toHaveBeenCalledWith('v2_message_schedule_save',expect.objectContaining({p_actor:actor,p_recipients:['one@example.com','two@example.com'],p_next:'2026-10-22T08:30:00.000Z'}));expect(m.flush).not.toHaveBeenCalled();});
 it('rejects unknown operations without mutation',async()=>{expect((await messageAction({},form('publish'))).error).toContain('valid message action');expect(m.rpc).not.toHaveBeenCalled();});
 it('deduplicates recipients and rejects header injection',()=>{expect(parseRecipients('A@example.com\na@example.com')).toEqual(['a@example.com']);expect(()=>parseRecipients('bad\r\nBcc: other@example.com')).toThrow();expect(()=>parseRecipients('')).toThrow();});
 it('allows only internal message notification targets',()=>{expect(notificationTarget(`/messages/${id}`)).toBe(`/messages/${id}`);expect(notificationTarget('//evil.test/messages')).toBe('/notifications');expect(notificationTarget('/messages/../../admin')).toBe('/notifications');});
 it('keeps an archived company update in history with a safe explanatory target',()=>{const target='/notifications#archived-company-request';expect(notificationTarget(target)).toBe(target);expect(notificationStatus({target_path:target,response_type:'action',pending:false} as PersonalNotification)).toContain('No response required');});
 it('rejects ambiguous timezone input',()=>{expect(()=>sastInput('tomorrow')).toThrow();});
});
