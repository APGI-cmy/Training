import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {rows} from '@/server/services/company-structure';
import {verifiedSessionClaims} from '@/server/auth/session-assurance';
import {STAGING_DATABASE_REF} from '@/server/environment-isolation';
import {deliverTransactionalEmail,emailConfiguration} from '@/server/services/email/transactional-delivery';
import {watchdogRpc} from './store';
import {watchdogActorId,type WatchdogAccess} from './access';
import {syntheticTotp} from './synthetic-totp';
import type {AlpSession} from '@/server/auth/session';
import type {WatchdogCheck} from '@/lib/security-watchdog';
export type Probe=(id:string,title:string,kind:WatchdogCheck['kind'],detail:string,test:()=>Promise<boolean>,action?:string)=>Promise<boolean>;
type Identity={id:string;session:AlpSession};
const base=`https://${STAGING_DATABASE_REF}.supabase.co`;
export const fixtureObject=(id:string)=>`watchdog-synthetic/${id}/canary.txt`;
async function ordinary(path:string,token?:string){return fetch(base+path,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,...(token?{authorization:`Bearer ${token}`}:{})},cache:'no-store',signal:AbortSignal.timeout(8000)});}
export const additionalCheckNames=[
 {id:'storage_positive',title:'Synthetic private file exists'},
 {id:'storage_anonymous',title:'Private file blocks anonymous direct access'},
 {id:'storage_foreign',title:'Private file blocks a normal unassigned user'},
 {id:'business_messages',title:'Messages reject direct database bypass'},
 {id:'business_reviews',title:'Review records reject direct database bypass'},
 {id:'business_payments',title:'Payment records reject direct database bypass'},
 {id:'business_email',title:'Email records reject direct database bypass'},
 {id:'business_receiving',title:'Private receiving accounts reject database bypass'},
 {id:'session_active',title:'Verified synthetic session is recognised'},
 {id:'synthetic_mfa',title:'Synthetic authenticator challenge and AAL2 upgrade'},
 {id:'session_revoked',title:'Signed-out synthetic session is revoked'},
 {id:'synthetic_restore',title:'Synthetic record restoration exercise'},
 {id:'email_fixture_block',title:'Fictional test mailboxes cannot receive external email'},
 {id:'mfa_enrolment',title:'Administrator authenticator enrolment'},
 {id:'scheduled_monitor',title:'Automatic security checks configured'},
 {id:'email_alarm',title:'External test alarm accepted by email provider'},
];
export async function additionalProbes(input:{runId:string;users:Identity[];scope:string|null;access:WatchdogAccess;check:Probe;checks:WatchdogCheck[]}){
 const {runId,users:[a,,c],scope,access,check,checks}=input;const object=fixtureObject(runId),marker='WATCHDOG-SYNTHETIC-FILE-'+runId;
 const file=await fetch(base+'/storage/v1/object/course-review-evidence/'+object,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY!,authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,'content-type':'text/plain','x-upsert':'false'},body:marker,cache:'no-store',signal:AbortSignal.timeout(10000)});
 const exists=await check('storage_positive','Synthetic private file exists','synthetic_behaviour','The authorised server can read the fictional test file. No customer file is used.',async()=>{if(!file.ok)return false;const r=await adminRest('/storage/v1/object/authenticated/course-review-evidence/'+object,{signal:AbortSignal.timeout(8000)});return r.ok&&(await r.text())===marker;});
 if(exists){
  await check('storage_anonymous','Private file blocks anonymous direct access','synthetic_behaviour','The known test file is not available to an anonymous direct download.',async()=>{const r=await ordinary('/storage/v1/object/authenticated/course-review-evidence/'+object);return [400,401,403,404].includes(r.status);});
  await check('storage_foreign','Private file blocks a normal unassigned user','synthetic_behaviour','A normal synthetic user has no direct access to the private evidence file. Authorised application download routes require separate coverage.',async()=>{const r=await ordinary('/storage/v1/object/authenticated/course-review-evidence/'+object,a.session.accessToken);return [400,401,403,404].includes(r.status);});
 }
 for(const [id,table,key,title] of [
  ['business_messages','v2_message_threads','id','Messages'],['business_reviews','course_review_rounds','id','Review records'],
  ['business_payments','v2_stripe_orders','id','Payment records'],['business_email','v2_email_outbox','id','Email records'],
  ['business_receiving','v2_stripe_personal_accounts','user_id','Private receiving accounts'],
 ])await check(id,title+' reject direct database bypass','synthetic_behaviour','The server confirms this data endpoint exists without reading any rows; the normal user must be denied table access. This does not replace tests of every application route.',async()=>{
  const path=`/rest/v1/${table}?select=${key}&limit=0`;const positive=await adminRest(path);if(!positive.ok)throw Error('Endpoint control unavailable');
  const negative=await ordinary(path,a.session.accessToken);return [401,403].includes(negative.status);
 });
 await check('synthetic_mfa','Synthetic authenticator challenge and AAL2 upgrade','synthetic_behaviour','A disposable test identity enrols an authenticator, verifies its challenge and obtains AAL2. Its secret stays in memory and the identity is removed. Real administrators must enrol privately.',async()=>{
  if(c.session.user.email!==`watchdog-${runId}-3@example.invalid`)throw Error('Synthetic identity guard failed');
  const call=(path:string,body:unknown)=>fetch(base+'/auth/v1/'+path,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${c.session.accessToken}`,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(8000)});
  const enrol=await call('factors',{factor_type:'totp',friendly_name:'Disposable Watchdog fixture',issuer:'APGI synthetic test'});if(!enrol.ok)throw Error('Synthetic enrolment unavailable');
  const factor=await enrol.json();if(!factor.id||!factor.totp?.secret)throw Error('Synthetic factor incomplete');
  const challenge=await call(`factors/${factor.id}/challenge`,{});if(!challenge.ok)throw Error('Synthetic challenge unavailable');const value=await challenge.json();
  const verified=await call(`factors/${factor.id}/verify`,{challenge_id:value.id,code:syntheticTotp(factor.totp.secret)});if(!verified.ok)return false;const result=await verified.json();
  if(result.user?.id!==c.id||!result.access_token)return false;
  const identity=await ordinary('/auth/v1/user',result.access_token);if(!identity.ok||(await identity.json()).id!==c.id)return false;
  if(verifiedSessionClaims(result.access_token,c.id)?.aal!=='aal2')return false;c.session.accessToken=result.access_token;return true;
 });
 const claimsA=verifiedSessionClaims(a.session.accessToken,a.id),claimsC=verifiedSessionClaims(c.session.accessToken,c.id);
 await check('session_active','Verified synthetic session is recognised','synthetic_behaviour','The revoked-session guard recognises a live, provider-verified synthetic session.',async()=>!!claimsA&&await watchdogRpc<boolean>('v2_watchdog_session_active',{p_actor:a.id,p_session:claimsA.sessionId}));
 await check('session_revoked','Signed-out synthetic session is revoked','synthetic_behaviour','The synthetic learner signs out. The session guard then rejects its previously issued session identifier.',async()=>{
  if(!claimsC)throw Error('Session identifier unavailable');const r=await fetch(base+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${c.session.accessToken}`},signal:AbortSignal.timeout(8000)});
  return r.ok&&!await watchdogRpc<boolean>('v2_watchdog_session_active',{p_actor:c.id,p_session:claimsC.sessionId});
 });
 await check('synthetic_restore','Synthetic record restoration exercise','synthetic_behaviour','One fictional canary is exported in memory, removed, restored and checked. This proves only the bounded fixture procedure, not restoration of a production backup.',async()=>{
  const records=await rows<Record<string,unknown>>(`/rest/v1/v2_watchdog_canaries?run_id=eq.${runId}&owner_id=eq.${a.id}&select=id,run_id,company_id,owner_id,marker`);if(records.length!==1)throw Error('Fixture unavailable');const saved=JSON.parse(JSON.stringify(records[0]));
  const deleted=await adminRest(`/rest/v1/v2_watchdog_canaries?id=eq.${saved.id}&run_id=eq.${runId}`,{method:'DELETE'});if(!deleted.ok)return false;
  const restored=await adminRest('/rest/v1/v2_watchdog_canaries',{method:'POST',body:JSON.stringify(saved)});if(!restored.ok)return false;
  const r=await ordinary(`/rest/v1/v2_watchdog_canaries?id=eq.${saved.id}&select=marker`,a.session.accessToken);const actual=r.ok?await r.json():[];return actual.length===1&&actual[0].marker===saved.marker;
 });
 await check('email_fixture_block','Fictional test mailboxes cannot receive external email','synthetic_behaviour','The deployed email sender rejects example.invalid recipients before contacting the provider.',async()=>{if(!emailConfiguration())throw Error('Mail control unavailable');const result=await deliverTransactionalEmail({to:`watchdog-${runId}-1@example.invalid`,subject:'Synthetic recipient-denial probe',html:'Synthetic',text:'Synthetic',idempotencyKey:'watchdog-denial-'+runId,tracking:false});return !result.ok&&result.error==='EMAIL_DELIVERY_FAILED';});
 const identity=await watchdogRpc<{administrators:number;mfaEnrolled:number}>('v2_watchdog_identity_counts',{p_actor:watchdogActorId(access),p_company:scope});
 checks.push({id:'mfa_enrolment',title:'Administrator authenticator enrolment',kind:'live_configuration',state:identity.administrators>0&&identity.mfaEnrolled===identity.administrators?'passed':'attention',detail:`${identity.mfaEnrolled} of ${identity.administrators} administrators in this scope have a verified authenticator. Enrolled accounts require the second factor at sign-in.`,action:identity.mfaEnrolled===identity.administrators?undefined:'Each administrator must privately enrol and verify their own authenticator in My account security.'});
 const monitors=await rows<{enabled:boolean}>(`/rest/v1/v2_watchdog_monitors?scope_key=eq.${scope??'platform'}&select=enabled&limit=1`);
 checks.push({id:'scheduled_monitor',title:'Automatic security checks configured',kind:'live_configuration',state:monitors[0]?.enabled?'passed':'attention',detail:'Daily and changed-deployment checks use the protected scheduler. This configuration check does not prove the scheduler is currently firing.',action:monitors[0]?.enabled?undefined:'Enable automatic checks for this scope.'});
 const alarms=await rows<{id:string;provider_id:string;sent_at:string}>(`/rest/v1/v2_watchdog_alerts?company_id=${scope?'eq.'+scope:'is.null'}&kind=eq.test&state=eq.accepted&provider_id=not.is.null&sent_at=gte.${encodeURIComponent(new Date(Date.now()-7*86400000).toISOString())}&select=id,provider_id,sent_at&limit=1`);
 checks.push({id:'email_alarm',title:'External test alarm accepted by email provider',kind:'alarm_drill',state:alarms.length?'passed':'not_tested',detail:alarms.length?'A scoped test alarm was accepted by the provider within seven days. This is not proof of inbox delivery; confirm your own reading separately.':'No recent scoped external test-alarm acceptance is recorded.',action:alarms.length?undefined:'Use Send a test alarm to my email, then verify it arrives and record your own read receipt.'});
}
