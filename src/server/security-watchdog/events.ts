import 'server-only';
import {createHmac} from 'node:crypto';
import {adminRest} from '@/server/supabase/admin-rest';
type SecurityEvent={kind:'auth_failure'|'company_access_denied'|'report_access_denied'|'monitor_failure'|'configuration_change'|'drill';actorId?:string;companyId?:string|null;synthetic?:boolean;subject?:string};
// Do not log passwords, tokens, email addresses, URLs, message bodies or IPs.
export async function recordSecurityEvent(event:SecurityEvent){
 try{
  const secret=process.env.SECURITY_WATCHDOG_SIGNING_KEY;
  const hash=event.subject&&secret?createHmac('sha256',secret).update(new Date().toISOString().slice(0,10)+event.subject.trim().toLowerCase()).digest('hex'):null;
  await adminRest('/rest/v1/rpc/v2_watchdog_event',{method:'POST',body:JSON.stringify({p_actor:event.actorId??null,p_company:event.companyId??null,p_kind:event.kind,p_synthetic:event.synthetic??false,p_hash:hash}),signal:AbortSignal.timeout(3000)});
 }catch{/* Telemetry availability must not weaken or bypass the access decision. */}
}
