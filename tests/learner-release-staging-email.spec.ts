import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/server/services/email/staging-capture',()=>({captureStagingAuthEmail:vi.fn(async()=>true)}));
import {sendCourseInvitationEmail} from '@/server/services/email/send-course-invitation';
import {sendAccountConfirmationEmail} from '@/server/services/email/send-account-confirmation';
import {sendPasswordRecoveryEmail} from '@/server/services/email/send-password-recovery';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
const network=vi.fn();
const input={invitationId:'invite',recipientEmail:'invited@example.com',invitedRole:'admin' as const,courseTitle:'Platform administration',invitationToken:'private-invite-token',expiresAt:'2099-01-01'};
beforeEach(()=>{
  vi.resetAllMocks();vi.stubGlobal('fetch',network);network.mockImplementation(async()=>Response.json({id:'provider-email-id'}));
  for(const [key,value] of Object.entries({ALP_ENVIRONMENT:'v2-staging',ALP_EMAIL_MODE:'transactional',STAGING_EMAIL_SCOPE:'apgi-v2-invitations',STAGING_RESEND_API_KEY:'re_staging_fixture',STAGING_EMAIL_FROM:'no_reply@apginc.ca',NEXT_PUBLIC_APP_URL:STAGING_ORIGIN,RESEND_API_KEY:'live-key-must-not-be-used',EMAIL_FROM:'live@example.com'}))vi.stubEnv(key,value);
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Explicit V2 transactional email',()=>{
 it('sends a clearly labelled administrator invitation using only the dedicated credential',async()=>{
   expect(await sendCourseInvitationEmail(input)).toMatchObject({ok:true,providerMessageId:'provider-email-id'});
   const [endpoint,request]=network.mock.calls[0];expect(endpoint).toBe('https://api.resend.com/emails');expect(request.headers.authorization).toBe('Bearer re_staging_fixture');
   const body=JSON.parse(request.body);expect(body.to).toEqual(['invited@example.com']);expect(body.subject).toBe('[APGI V2 TEST] Your APGI administrator invitation');expect(body.from).toBe('APGI Training V2 <no_reply@apginc.ca>');expect(body.text).toContain(STAGING_ORIGIN+'/invitations/private-invite-token');expect(body.text).toContain('full administrator access');expect(body.text).not.toContain('enrol in Platform administration');expect(request.body).not.toContain('live-key');
 });
 it('sends confirmation and safe recovery links to V2, without capturing usable tokens for administrators',async()=>{
   expect(await sendAccountConfirmationEmail('invited@example.com','confirm-token')).toBe(true);
   expect(await sendPasswordRecoveryEmail('invited@example.com','reset-token','https://evil.invalid')).toBe(true);
   const messages=network.mock.calls.map(([,r])=>JSON.parse(r.body));expect(messages[0].subject).toContain('[APGI V2 TEST] Confirm');expect(messages[0].text).toContain(STAGING_ORIGIN+'/confirm-account?token_hash=confirm-token');expect(messages[1].text).toContain(STAGING_ORIGIN+'/reset-password?token_hash=reset-token');expect(messages[1].text).not.toContain('evil.invalid');
 });
 it.each(['STAGING_RESEND_API_KEY','STAGING_EMAIL_SCOPE'])('does not fall back to a live credential when %s is missing',async key=>{vi.stubEnv(key,'');expect(await sendCourseInvitationEmail(input)).toMatchObject({ok:false,error:'EMAIL_NOT_CONFIGURED'});expect(network).not.toHaveBeenCalled();});
 it('rejects an accidental live-origin link',async()=>{vi.stubEnv('NEXT_PUBLIC_APP_URL','https://training-platform-kappa.vercel.app');expect((await sendCourseInvitationEmail(input)).ok).toBe(false);expect(network).not.toHaveBeenCalled();});
 it('never attempts real delivery to fictional integration accounts',async()=>{expect((await sendCourseInvitationEmail({...input,recipientEmail:'qa@example.invalid'})).ok).toBe(false);expect(network).not.toHaveBeenCalled();});
 it('reports provider rejection without claiming that mail was sent',async()=>{network.mockResolvedValue(new Response('rejected',{status:403}));expect(await sendCourseInvitationEmail(input)).toEqual({ok:false,error:'EMAIL_DELIVERY_FAILED'});});
 it('does not claim acceptance without a provider message identifier',async()=>{network.mockResolvedValue(Response.json({}));expect((await sendCourseInvitationEmail(input)).ok).toBe(false);});
 it('gives a rotated invitation its own idempotency key',async()=>{await sendCourseInvitationEmail(input);await sendCourseInvitationEmail({...input,invitationToken:'new-private-token'});expect(network.mock.calls[0][1].headers['idempotency-key']).not.toBe(network.mock.calls[1][1].headers['idempotency-key']);});
});
