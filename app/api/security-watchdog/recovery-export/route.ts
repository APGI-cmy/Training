import {watchdogAccess,WatchdogError,watchdogResponseError,requireSameOrigin} from '@/server/security-watchdog/access';
import {requireRecoveryMfa,encryptedServiceRecovery} from '@/server/security-watchdog/recovery-export';
import {claimSecurityBudget} from '@/server/security/auth-budget';
import {adminRest} from '@/server/supabase/admin-rest';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
async function confirmed(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json')||Number(request.headers.get('content-length')??0)>512)throw new WatchdogError('Confirm the encrypted recovery download.',400);
 const reader=request.body?.getReader();if(!reader)throw new WatchdogError('Confirm the encrypted recovery download.',400);
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>512)throw new WatchdogError('Recovery request is too large.',400);chunks.push(r.value);}}finally{await reader.cancel().catch(()=>{});}
 let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new WatchdogError('Confirm the encrypted recovery download.',400);}
 if(!body||Array.isArray(body)||Object.keys(body).length!==1||body.confirm!==true)throw new WatchdogError('Confirm the encrypted recovery download.',400);
}
export async function POST(request:Request){
 try{
  requireSameOrigin(request);const access=await watchdogAccess();
  if(!access.principal)throw new WatchdogError('Only main APGI administrators can export platform recovery credentials.');
  requireRecoveryMfa(access.session);await confirmed(request);
  if(!await claimSecurityBudget('service-recovery-export:'+access.session.user.id,4,3600))throw new WatchdogError('The recovery download limit has been reached. Try again in one hour.',429);
  const encrypted=await encryptedServiceRecovery();
  const audit=await adminRest('/rest/v1/rpc/v2_watchdog_event',{method:'POST',body:JSON.stringify({p_actor:access.session.user.id,p_company:null,p_kind:'configuration_change',p_synthetic:false,p_hash:null}),signal:AbortSignal.timeout(5000)});
  if(!audit.ok)throw new WatchdogError('The recovery export audit could not be recorded. Please retry later.',503);
  return new Response(new Uint8Array(encrypted).buffer,{headers:{'content-type':'application/pgp-encrypted','content-disposition':`attachment; filename="APGI-V2-service-recovery-${new Date().toISOString().slice(0,10)}.pgp"`,'cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
 }catch(error){return watchdogResponseError(error);}
}
