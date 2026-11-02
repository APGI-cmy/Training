import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {rows} from '@/server/services/company-structure';
import type {WatchdogAccess} from './access';
import {checkWatchdogScope,WatchdogError,watchdogRunFields} from './access';
import type {WatchdogRun} from '@/lib/security-watchdog';
export async function watchdogRpc<T>(name:string,body:unknown):Promise<T>{
 const response=await adminRest(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(body)});
 if(!response.ok){const result=await response.json().catch(()=>({}));
  if(String(result.message).includes('WATCHDOG_BUSY'))throw new WatchdogError('Another security test is running. Try again in a few minutes.',409);
  if(String(result.message).includes('WATCHDOG_RATE_LIMIT'))throw new WatchdogError('Please wait 90 seconds between tests. The daily limit is 20 tests per administrator.',429);
  if(String(result.message).includes('WATCHDOG_SCOPE_DENIED'))throw new WatchdogError('This security scope is unavailable.');
  throw Error('Watchdog database operation failed.');
 }
 return response.json();
}
export async function watchdogPatch(id:string,body:unknown){
 const r=await adminRest(`/rest/v1/v2_watchdog_runs?id=eq.${id}`,{method:'PATCH',body:JSON.stringify(body)});
 if(!r.ok)throw Error('Watchdog evidence could not be saved.');
}
export type EvidenceRow={id:string;company_id:string|null;control_id:string;disposition:string;reference:string;created_at:string;expires_at:string};
async function currentScope(access:WatchdogAccess,scope:string|null){
 checkWatchdogScope(access,scope);
 if(!await watchdogRpc<boolean>('v2_watchdog_allowed',{p_actor:access.session.user.id,p_company:scope}))throw new WatchdogError('This security scope is unavailable.');
}
export async function watchdogEvidence(access:WatchdogAccess,scope:string|null){
 await currentScope(access,scope);
 return rows<EvidenceRow>(`/rest/v1/v2_watchdog_evidence?select=id,company_id,control_id,disposition,reference,created_at,expires_at&company_id=${scope?`eq.${scope}`:'is.null'}&order=created_at.desc&limit=50`);
}
export async function watchdogDashboard(access:WatchdogAccess,scope:string|null){
 await currentScope(access,scope);
 const [runs,deliveries,evidence]=await Promise.all([
 rows<WatchdogRun>(`/rest/v1/v2_watchdog_runs?select=${watchdogRunFields}${scope?`&company_id=eq.${scope}`:''}&order=created_at.desc&limit=30`),
 rows<{id:string;run_id:string;created_at:string;read_at:string|null}>(`/rest/v1/v2_watchdog_deliveries?recipient_id=eq.${access.session.user.id}&select=id,run_id,created_at,read_at&order=created_at.desc&limit=60`),
 watchdogEvidence(access,scope)]);
 const visible=new Set(runs.map(r=>r.id));
 return {runs,deliveries:deliveries.filter(d=>visible.has(d.run_id)),evidence};
}
