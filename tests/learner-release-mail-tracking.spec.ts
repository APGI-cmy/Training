import {createHmac} from 'node:crypto';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {verifyMailWebhook} from '@/lib/resend-webhook';
import {invitationProgress,mailDeliveryLabel} from '@/lib/mail-tracking';
const m=vi.hoisted(()=>({rest:vi.fn(),begin:vi.fn(),finish:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
vi.mock('@/server/services/email/delivery-ledger',()=>({beginMailAttempt:m.begin,finishMailAttempt:m.finish}));
import {deliverTransactionalEmail} from '@/server/services/email/transactional-delivery';
import {POST} from '../app/api/email/events/route';
const secret='whsec_'+Buffer.from('mail-test-secret-only').toString('base64');
function signed(body:string,now=Date.now(),id='event-test'){const timestamp=String(Math.floor(now/1000));const signature=createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${timestamp}.${body}`).digest('base64');return new Headers({'svix-id':id,'svix-timestamp':timestamp,'svix-signature':`v1,${signature}`});}
const payload=()=>JSON.stringify({type:'email.opened',created_at:new Date().toISOString(),data:{email_id:'provider-123456789'}});
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('ALP_ENVIRONMENT','v2-staging');vi.stubEnv('ALP_EMAIL_MODE','transactional');vi.stubEnv('STAGING_EMAIL_SCOPE','apgi-v2-invitations');vi.stubEnv('STAGING_RESEND_API_KEY','fixture');vi.stubEnv('STAGING_EMAIL_FROM','no_reply@apginc.ca');vi.stubEnv('NEXT_PUBLIC_APP_URL','https://training-platform-v2-staging.vercel.app');vi.stubEnv('STAGING_RESEND_WEBHOOK_SECRET',secret);m.rest.mockResolvedValue(new Response(null,{status:204}));m.begin.mockResolvedValue({id:'attempt',state:'sending',provider_id:null});m.finish.mockResolvedValue(undefined);});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Email status honesty',()=>{
 it('keeps provider acceptance separate from signup and opening',()=>{expect(mailDeliveryLabel({state:'accepted',provider_event:null})).toBe('Accepted by provider');expect(invitationProgress({category:'admin_invitation',accepted_at:null,invitation_status:'sent',expires_at:'2099-01-01'})).toBe('Awaiting signup and profile');expect(mailDeliveryLabel({state:'accepted',provider_event:'bounced'})).toBe('Bounced');});
 it('does not treat an expired invitation as accepted',()=>{expect(invitationProgress({category:'company_invitation',accepted_at:null,invitation_status:'sent',expires_at:'2020-01-01'})).toBe('Expired');});
});
describe('Signed provider events',()=>{
 it('accepts a valid signature and only returns minimal event evidence',()=>{const raw=payload();expect(verifyMailWebhook(raw,signed(raw),secret)).toMatchObject({kind:'opened',provider_id:'provider-123456789',event_key:'event-test'});});
 it('matches the vendor manual-verification test vector',()=>{const headers=new Headers({'svix-id':'msg_loFOjxBNrRLzqYUf','svix-timestamp':'1731705121','svix-signature':'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0='});expect(verifyMailWebhook('{"event_type":"ping","data":{"success":true}}',headers,'whsec_plJ3nmyCDGBKInavdOK15jsl',1731705121000)).toBeNull();});
 it('rejects changed bodies, stale requests and missing secrets',()=>{const raw=payload();expect(()=>verifyMailWebhook(raw+' ',signed(raw),secret)).toThrow();expect(()=>verifyMailWebhook(raw,signed(raw,Date.now()-601000),secret)).toThrow();expect(()=>verifyMailWebhook(raw,signed(raw),'')).toThrow();});
 it('deduplicates by provider event ID and does not store request content',async()=>{const raw=payload();const response=await POST(new Request('https://example.invalid/api/email/events',{method:'POST',headers:signed(raw),body:raw}));expect(response.status).toBe(204);expect(m.rest.mock.calls[0][0]).toContain('on_conflict=event_key');expect(m.rest.mock.calls[0][1].headers.Prefer).toBe('resolution=ignore-duplicates');expect(JSON.parse(m.rest.mock.calls[0][1].body)).not.toHaveProperty('data');});
 it('never writes an unsigned event',async()=>{expect((await POST(new Request('https://example.invalid/api/email/events',{method:'POST',body:payload()}))).status).toBe(400);expect(m.rest).not.toHaveBeenCalled();});
});
describe('Durable sending evidence',()=>{
 const email={to:'test@example.com',subject:'Hello',html:'<p>Hello</p>',text:'Hello',idempotencyKey:'fixture-key',tracking:{category:'email_set' as const}};
 it('records acceptance only after a provider identifier is returned',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json({id:'provider-id'})));expect(await deliverTransactionalEmail(email)).toMatchObject({ok:true});expect(m.finish).toHaveBeenCalledWith('attempt',{providerId:'provider-id'});});
 it('blocks sending when its audit entry cannot be created',async()=>{m.begin.mockRejectedValue(Error('unavailable'));const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect((await deliverTransactionalEmail(email)).ok).toBe(false);expect(fetcher).not.toHaveBeenCalled();});
 it('retains failure evidence for a rejected send',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:429})));expect((await deliverTransactionalEmail(email)).ok).toBe(false);expect(m.finish).toHaveBeenCalledWith('attempt',{error:'Email provider rate limit reached. Try again later.'});});
 it('does not send an already accepted attempt again',async()=>{m.begin.mockResolvedValue({id:'attempt',state:'accepted',provider_id:'earlier-id'});const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect(await deliverTransactionalEmail(email)).toMatchObject({ok:true,providerMessageId:'earlier-id'});expect(fetcher).not.toHaveBeenCalled();});
 it('leaves the separate trackers unmodified when tracking is disabled',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json({id:'provider-id'})));expect((await deliverTransactionalEmail({...email,tracking:false})).ok).toBe(true);expect(m.begin).not.toHaveBeenCalled();});
});
