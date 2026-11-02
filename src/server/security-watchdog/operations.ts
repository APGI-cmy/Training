import 'server-only';
import {createHash} from 'node:crypto';
import {adminRest} from '@/server/supabase/admin-rest';
import {rows} from '@/server/services/company-structure';
import {deliverTransactionalEmail} from '@/server/services/email/transactional-delivery';
import {STAGING_ORIGIN,assertStagingIsolation} from '@/server/environment-isolation';
import {watchdogRpc} from './store';
import {checkWatchdogScope,watchdogActorId,WatchdogError,type WatchdogAccess} from './access';
import type {WatchdogActionRow,WatchdogMonitor,WatchdogAlert} from '@/lib/watchdog-overview';
import type {WatchdogRun} from '@/lib/security-watchdog';
export async function watchdogOperations(access:WatchdogAccess,scope:string|null){
 checkWatchdogScope(access,scope);const actor=watchdogActorId(access);
 if(!await watchdogRpc<boolean>('v2_watchdog_allowed',{p_actor:actor,p_company:scope}))throw new WatchdogError('This security scope is unavailable.');
 const filter=scope?`eq.${scope}`:'is.null';
 const [monitors,actions,alerts,events,identity]=await Promise.all([
  rows<WatchdogMonitor>(`/rest/v1/v2_watchdog_monitors?scope_key=eq.${scope??'platform'}&select=enabled,last_attempt_at,last_run_at,last_deployment,last_run_id&limit=1`),
  rows<WatchdogActionRow>(`/rest/v1/v2_watchdog_actions?company_id=${filter}&select=id,company_id,control_id,owner_label,state,due_at,note,updated_at&order=control_id`),
  rows<WatchdogAlert>(`/rest/v1/v2_watchdog_alerts?recipient_id=eq.${actor}${scope?`&company_id=eq.${scope}`:''}&select=id,run_id,kind,severity,state,created_at,read_at,sent_at&order=created_at.desc&limit=20`),
  rows<{kind:string;severity:string;created_at:string}>(`/rest/v1/v2_watchdog_events?synthetic=eq.false${scope?`&company_id=eq.${scope}`:''}&created_at=gte.${encodeURIComponent(new Date(Date.now()-86400000).toISOString())}&select=kind,severity,created_at&order=created_at.desc&limit=250`),
  watchdogRpc<{administrators:number;mfaEnrolled:number}>('v2_watchdog_identity_counts',{p_actor:actor,p_company:scope}),
 ]);
 return {monitor:monitors[0]??null,actions,alerts,events,identity};
}
type AlertJob=WatchdogAlert&{recipient_id:string;company_id:string|null;attempts:number;provider_id:string|null};
export async function queueWatchdogResult(access:WatchdogAccess,scope:string|null,run:WatchdogRun){
 if(!run.payload)return 0;
 const incomplete=run.state==='cleanup_pending'||run.state==='inconclusive';
 if(!incomplete&&!run.payload.checks.some(c=>c.state==='failed'||c.state==='attention'))return 0;
 return watchdogRpc<number>('v2_watchdog_alert_queue',{p_actor:watchdogActorId(access),p_company:scope,p_run:run.id,p_kind:incomplete?'incomplete':'findings',p_test:false});
}
export async function flushWatchdogAlerts(){
 assertStagingIsolation();const jobs=await watchdogRpc<AlertJob[]>('v2_watchdog_alert_claim',{});
 let accepted=0,failed=0;
 await Promise.all(jobs.map(async job=>{
  const userResponse=await adminRest(`/auth/v1/admin/users/${job.recipient_id}`,{signal:AbortSignal.timeout(8000)});
  if(!userResponse.ok&&userResponse.status!==404)throw Error('Alert recipient verification is temporarily unavailable.');
  const user=userResponse.ok?await userResponse.json():null;
  const allowed=user?.email_confirmed_at&&await watchdogRpc<boolean>('v2_watchdog_allowed',{p_actor:job.recipient_id,p_company:job.company_id});
  if(!allowed){await adminRest(`/rest/v1/v2_watchdog_alerts?id=eq.${job.id}`,{method:'PATCH',body:JSON.stringify({state:'cancelled'})});return;}
  const label=job.kind==='test'?'TEST ALARM — no breach is being reported':job.kind==='reminder'?'Reminder: an unread security alert needs review':job.kind==='security_events'?'Security activity requires review':job.kind==='incomplete'?'A security check could not finish':'A security check needs attention';
  const link=`${STAGING_ORIGIN}/security-watchdog?scope=${job.company_id??'platform'}${job.run_id?'&run='+job.run_id:''}`;
  const text=`${label}\n\nOpen your scoped Security Watchdog dashboard to see the exact checks, gaps and required actions. Sign in with your own account. This email contains no customer information or private records.\n\n${link}\n\nProvider acceptance is not proof that this email reached your inbox. Record your own read receipt in Watchdog.`;
  const html=`<h1>${label}</h1><p>Open your scoped Watchdog dashboard to review the evidence and required actions.</p><p><a href="${link}">Open Security Watchdog</a></p><p>No customer information or private records are included. Record your own read receipt after signing in.</p>`;
  const result=await deliverTransactionalEmail({to:user.email,subject:'Security Watchdog: '+label,text,html,idempotencyKey:createHash('sha256').update('watchdog-alert:'+job.id).digest('hex'),tracking:{category:'system',organisationId:job.company_id,sourceId:job.id,messageKey:'watchdog-alert:'+job.id}});
  const changed=await adminRest(`/rest/v1/v2_watchdog_alerts?id=eq.${job.id}`,{method:'PATCH',body:JSON.stringify({state:result.ok?'accepted':'failed',provider_id:result.ok?result.providerMessageId:null,sent_at:result.ok?new Date().toISOString():null,next_at:new Date(Date.now()+15*60000).toISOString()})});
  if(!changed.ok)throw Error('Alert status requires reconciliation.');
  if(result.ok)accepted++;else failed++;
 }));return {accepted,failed};
}
