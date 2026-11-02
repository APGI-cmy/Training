import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {rows} from '@/server/services/company-structure';
import {watchdogRpc} from './store';
import {runSecurityWatchdog,watchdogDeployment} from './runner';
import {queueWatchdogResult,flushWatchdogAlerts} from './operations';
import {recordSecurityEvent} from './events';
export async function runWatchdogSchedule(){
 const job=await watchdogRpc<{actorId:string;companyId:string|null;requestId:string;principal:boolean;reason:'scheduled'|'deployment'}|null>('v2_watchdog_monitor_claim',{p_deployment:watchdogDeployment()});
 let runId:string|null=null;
 if(job){
  const access={actorId:job.actorId,automatic:true as const,principal:job.principal,ownedCompanyIds:job.companyId?[job.companyId]:[]};
  try{
   const run=await runSecurityWatchdog(access,job.companyId,job.requestId,job.reason);runId=run.id;
   if(run.state==='finished'){
    const r=await adminRest(`/rest/v1/v2_watchdog_monitors?scope_key=eq.${job.companyId??'platform'}`,{method:'PATCH',body:JSON.stringify({last_run_at:new Date().toISOString(),last_run_id:run.id,last_deployment:watchdogDeployment()})});if(!r.ok)throw Error('Monitor completion was not recorded.');
   }
   await queueWatchdogResult(access,job.companyId,run);
  }catch{await recordSecurityEvent({kind:'monitor_failure',actorId:job.actorId,companyId:job.companyId});}
 }
 // An instrumented event burst raises a bounded, hourly-deduplicated alert.
 const events=await rows<{id:string}>(`/rest/v1/v2_watchdog_events?synthetic=eq.false&kind=in.(auth_failure,company_access_denied,report_access_denied,monitor_failure)&created_at=gte.${encodeURIComponent(new Date(Date.now()-10*60000).toISOString())}&select=id&limit=11`);
 if(events.length>=10){
  const monitor=(await rows<{owner_id:string}>('/rest/v1/v2_watchdog_monitors?scope_key=eq.platform&enabled=eq.true&select=owner_id&limit=1'))[0];
  if(monitor)await watchdogRpc('v2_watchdog_alert_queue',{p_actor:monitor.owner_id,p_company:null,p_run:null,p_kind:'security_events',p_test:false});
 }
 const reminders=await watchdogRpc<number>('v2_watchdog_alert_reminders',{});
 const mail=await flushWatchdogAlerts();return {automaticRun:runId,reminders,...mail};
}
