import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({mail:vi.fn(),rest:vi.fn()}));
vi.mock('@/server/services/email/send-course-invitation',()=>({sendCourseInvitationEmail:m.mail}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
import {deliverStoredInvitation} from '@/server/services/invitations/deliver-stored-invitation';
const input={id:'invitation',recipientEmail:'admin@example.com',role:'admin' as const,courseTitle:'Platform administration',token:'private-token',expiresAt:'2099-01-01',actorId:'inviter'};
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('ALP_ENVIRONMENT','v2-staging');vi.stubEnv('ALP_EMAIL_MODE','transactional');vi.stubEnv('STAGING_EMAIL_SCOPE','apgi-v2-invitations');m.mail.mockResolvedValue({ok:true,providerMessageId:'provider-id'});m.rest.mockImplementation(async()=>Response.json([{id:'invitation'}]));});
afterEach(()=>vi.unstubAllEnvs());
describe('Stored invitation delivery evidence',()=>{
 it('marks sent and records provider acceptance without returning the usable link',async()=>{expect(await deliverStoredInvitation(input)).toEqual({ok:true,invitationId:'invitation',deliveryStatus:'sent'});expect(m.mail).toHaveBeenCalledWith(expect.objectContaining({recipientEmail:'admin@example.com',invitedRole:'admin'}));expect(JSON.parse(m.rest.mock.calls.find(([,init])=>init.method==='PATCH')![1].body)).toEqual({status:'sent'});expect(JSON.parse(m.rest.mock.calls.find(([p])=>p==='/rest/v1/course_invitation_events')![1].body).metadata.provider_message_id).toBe('provider-id');});
 it('keeps a failed send retryable and records a failure instead of sent',async()=>{m.mail.mockResolvedValue({ok:false,error:'EMAIL_DELIVERY_FAILED'});expect(await deliverStoredInvitation(input)).toMatchObject({ok:false,error:'EMAIL_DELIVERY_FAILED'});expect(m.rest.mock.calls.some(([,init])=>init.method==='PATCH')).toBe(false);expect(JSON.parse(m.rest.mock.calls[0][1].body).event_type).toBe('failed');});
 it('does not report success if acceptance cannot be recorded',async()=>{m.rest.mockResolvedValue(new Response('unavailable',{status:503}));expect(await deliverStoredInvitation(input)).toMatchObject({ok:false,error:'INVITATION_SENT_AUDIT_FAILED'});});
 it('retains explicit email-disabled capture mode for fictional integration tests',async()=>{vi.stubEnv('ALP_EMAIL_MODE','disabled');vi.stubEnv('NEXT_PUBLIC_APP_URL','https://training-platform-v2-staging.vercel.app');expect(await deliverStoredInvitation(input)).toMatchObject({ok:true,deliveryStatus:'staging_link'});expect(m.mail).not.toHaveBeenCalled();});
});
