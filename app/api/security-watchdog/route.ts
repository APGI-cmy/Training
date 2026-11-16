import {manualControls} from '@/lib/security-watchdog';
import {watchdogAccess,checkWatchdogScope,watchdogId,requireSameOrigin,WatchdogError,watchdogResponseError} from '@/server/security-watchdog/access';
import {watchdogDashboard,watchdogRpc} from '@/server/security-watchdog/store';
import {runSecurityWatchdog} from '@/server/security-watchdog/runner';
import {watchdogActions} from '@/lib/watchdog-overview';
import {queueWatchdogResult,flushWatchdogAlerts} from '@/server/security-watchdog/operations';
export const dynamic='force-dynamic';
export const maxDuration=300;
function scopeOf(value:unknown){return value===null||value==='platform'?null:watchdogId(String(value));}
export async function GET(request:Request){
 try{const access=await watchdogAccess(),query=new URL(request.url).searchParams;
  const scope=scopeOf(query.get('scope')??(access.principal?'platform':access.ownedCompanyIds[0]??''));
  checkWatchdogScope(access,scope);
  return Response.json(await watchdogDashboard(access,scope),{headers:{'cache-control':'private, no-store'}});
 }catch(error){return watchdogResponseError(error);}
}
export async function POST(request:Request){
 try{
  requireSameOrigin(request);const access=await watchdogAccess();
  if(Number(request.headers.get('content-length')??0)>10000)throw new WatchdogError('Request is too large.',400);
  const body=await request.json();
  if(body.operation==='acknowledge'){
   const read=await watchdogRpc<boolean>('v2_watchdog_acknowledge',{p_actor:access.session.user.id,p_delivery:watchdogId(String(body.deliveryId))});
   if(!read)throw new WatchdogError('This read receipt is unavailable.',404);
   return Response.json({read:true},{headers:{'cache-control':'private, no-store'}});
  }
  const scope=scopeOf(body.scope);checkWatchdogScope(access,scope);
  if(body.operation==='run'){
   if(body.consent!==true)throw new WatchdogError('Confirm the controlled synthetic test before starting.',400);
   const run=await runSecurityWatchdog(access,scope,watchdogId(String(body.requestId)));
   const queued=await queueWatchdogResult(access,scope,run);if(queued)await flushWatchdogAlerts();
   return Response.json({runId:run.id},{headers:{'cache-control':'private, no-store'}});
  }
  if(body.operation==='monitor'){
   if(typeof body.enabled!=='boolean')throw new WatchdogError('Select whether automatic checks are enabled.',400);
   await watchdogRpc('v2_watchdog_monitor_set',{p_actor:access.session.user.id,p_company:scope,p_enabled:body.enabled});
   return Response.json({saved:true},{headers:{'cache-control':'private, no-store'}});
  }
  if(body.operation==='test_alert'){
   await watchdogRpc('v2_watchdog_alert_queue',{p_actor:access.session.user.id,p_company:scope,p_run:null,p_kind:'test',p_test:true});
   return Response.json(await flushWatchdogAlerts(),{headers:{'cache-control':'private, no-store'}});
  }
  if(body.operation==='alert_read'){
   const saved=await watchdogRpc<boolean>('v2_watchdog_alert_read',{p_actor:access.session.user.id,p_alert:watchdogId(String(body.alertId))});
   if(!saved)throw new WatchdogError('This alert receipt is unavailable.',404);
   return Response.json({saved:true},{headers:{'cache-control':'private, no-store'}});
  }
  if(body.operation==='action'){
   if(!watchdogActions.some(a=>a.id===body.controlId)||!['open','in_progress','evidence_ready'].includes(body.state))throw new WatchdogError('Select a valid action and status.',400);
   const owner=String(body.owner??'').trim(),note=String(body.note??'').trim(),due=String(body.due??'');
   if(owner.length<2||owner.length>120||note.length>2000||(due&&(!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due)))throw new WatchdogError('Check the owner, date and evidence note.',400);
   await watchdogRpc('v2_watchdog_action_save',{p_actor:access.session.user.id,p_company:scope,p_control:body.controlId,p_owner:owner,p_state:body.state,p_due:due||null,p_note:note});
   return Response.json({saved:true},{headers:{'cache-control':'private, no-store'}});
  }
  if(body.operation==='evidence'){
   if(!manualControls.some(c=>c.id===body.controlId)||!['recorded','gap','not_applicable'].includes(body.disposition))throw new WatchdogError('Select an evidence control and disposition.',400);
   const reference=String(body.reference??'').trim(),expires=String(body.expires??'');
   if(reference.length<5||reference.length>1500||!/^\d{4}-\d{2}-\d{2}$/.test(expires)||!Number.isFinite(Date.parse(expires)))throw new WatchdogError('Enter an evidence reference and valid future review date.',400);
   const expiry=new Date(expires+'T23:59:59Z');
   if(expiry.getTime()<=Date.now()||expiry.getTime()>Date.now()+366*86400000)throw new WatchdogError('Choose a future review date within one year.',400);
   await watchdogRpc('v2_watchdog_record_evidence',{p_actor:access.session.user.id,p_company:scope,p_control:body.controlId,p_disposition:body.disposition,p_reference:reference,p_expires:expiry.toISOString()});
   return Response.json({saved:true},{headers:{'cache-control':'private, no-store'}});
  }
  throw new WatchdogError('Unknown Watchdog operation.',400);
 }catch(error){return watchdogResponseError(error);}
}
