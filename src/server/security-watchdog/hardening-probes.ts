import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {providerTarget} from '@/server/security/provider-fetch';
import {claimSecurityBudget,securityBucket} from '@/server/security/auth-budget';
import {adminRest} from '@/server/supabase/admin-rest';
import {watchdogHttp} from './http-probes';
import {stepUpFixture} from './synthetic-mfa';
import type {AlpSession} from '@/server/auth/session';
import type {Probe} from './additional-probes';
export const hardeningCheckNames=[
 {id:'mfa_admin_gate',title:'Unverified administrator is restricted to account setup'},
 {id:'mfa_admin_stepup',title:'Administrator gains scoped access after two-step verification'},
 {id:'identity_budget',title:'Shared sign-in counter enforces its concurrent attempt limit'},
 {id:'outbound_allowlist',title:'Outbound adapter rejects unapproved destinations and credential forwarding'},
 {id:'certificate_eligibility',title:'Unqualified synthetic learner cannot receive a certificate'},
 {id:'edge_control',title:'Firewall test control endpoint is reachable'},
 {id:'edge_canary',title:'Deployed firewall blocks the harmless canary path'},
];
export async function prepareFixtureMfa(runId:string,users:{id:string;session:AlpSession}[],check:Probe){
 const [a,b]=users;
 await check('mfa_admin_gate','Unverified administrator is restricted to account setup','synthetic_behaviour','A freshly created fictional company owner may open their own authenticator setup but cannot open the private security dashboard or read their own profile through the Data API before enrolment.',async()=>{
  const own=await watchdogHttp('/api/account-security',a);if(!own.ok)return false;
  const blocked=await watchdogHttp('/api/security-watchdog',a);
  const data=await adminRest('/rest/v1/profiles?select=user_id&user_id=eq.'+a.id);if(!data.ok||(await data.json()).length!==1)throw Error('Profile control unavailable');
  const direct=await import('@/server/security/provider-fetch').then(m=>m.providerFetch(`https://${process.env.ALP_STAGING_DATABASE_REF}.supabase.co/rest/v1/profiles?select=user_id&user_id=eq.${a.id}`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${a.session.accessToken}`}}));
  return blocked.status===401&&direct.ok&&(await direct.json()).length===0;
 });
 // Owner tests beyond this point need real provider-issued AAL2 sessions. The
 // synthetic secrets never leave this process or become report evidence.
 await stepUpFixture(runId,a);await stepUpFixture(runId,b);
 await check('mfa_admin_stepup','Administrator gains scoped access after two-step verification','synthetic_behaviour','The same fictional owner can open their own company dashboard after completing provider TOTP verification.',async()=>(await watchdogHttp('/api/security-watchdog?scope='+encodeURIComponent((await import('./access').then(m=>m.watchdogAccess(a.session))).ownedCompanyIds[0]),a)).ok);
}
export async function hardeningProbes(runId:string,users:{id:string;session:AlpSession}[],companyIds:string[],check:Probe){
 await check('identity_budget','Shared sign-in counter enforces its concurrent attempt limit','synthetic_behaviour','Twelve concurrent claims against a run-tagged disposable counter permit exactly eight. Another claim is refused and a separate counter remains independent. Real sign-in budgets and provider abuse limits are not consumed.',async()=>{
  const label='watchdog-budget:'+runId;
  const result=await Promise.all(Array.from({length:12},()=>claimSecurityBudget(label,8,900,runId)));
  const rows=await adminRest('/rest/v1/v2_security_budgets?bucket_hash=eq.'+securityBucket(label)+'&test_run=eq.'+runId+'&select=requests');
  if(!rows.ok)throw Error('Counter control unavailable');const value=await rows.json();
  return result.filter(Boolean).length===8&&!await claimSecurityBudget(label,8,900,runId)&&await claimSecurityBudget(label+':other',8,900,runId)&&value.length===1&&value[0].requests===8;
 });
 await check('outbound_allowlist','Outbound adapter rejects unapproved destinations and credential forwarding','synthetic_behaviour','The deployed adapter validates fixed approved destinations, rejects an unapproved host, local addresses, cookie forwarding and cross-provider credential use before any request is sent. This is not an OS-level egress firewall or DLP scan.',async()=>{
  providerTarget('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer re_watchdog_synthetic'}});
  const probes:[string,RequestInit?][]=[['https://example.invalid/'],['http://127.0.0.1/'],['https://api.resend.com/emails',{headers:{authorization:'Bearer rk_test_watchdog'}}],['https://api.resend.com/emails',{headers:{authorization:'Bearer re_watchdog',cookie:'synthetic'}}],['https://api.resend.com/emails',{headers:{authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY}}]];
  return probes.every(([url,init])=>{try{providerTarget(url,init);return false;}catch{return true;}});
 });
 await check('certificate_eligibility','Unqualified synthetic learner cannot receive a certificate','synthetic_behaviour','A run-tagged fictional learner with no qualifying course cannot receive a certificate. The existing eligibility trigger must reject the insert. No learner marks, valid certificates or real certificate numbers are created.',async()=>{
  const id=randomUUID(),number='WATCHDOG-VOID-'+runId;
  const r=await adminRest('/rest/v1/issued_certificates',{method:'POST',body:JSON.stringify({id,certificate_number:number,user_id:users[2].id,organisation_id:companyIds[0],course_id:'watchdog-no-course-'+runId,snapshot:{synthetic:true},signature:'0'.repeat(64)})});
  if(r.ok){await adminRest(`/rest/v1/issued_certificates?id=eq.${id}&certificate_number=eq.${number}`,{method:'DELETE'});return false;}
  const value=await r.json();return r.status===400&&value.message==='CERTIFICATE_NOT_ELIGIBLE';
 });
 const control=await check('edge_control','Firewall test control endpoint is reachable','synthetic_behaviour','A public code-owned control route returns only a fixed harmless marker. No sensitive information or arbitrary URL is involved.',async()=>{const r=await watchdogHttp('/api/security-watchdog/edge-control');return r.ok&&(await r.text())==='APGI-WATCHDOG-EDGE-CONTROL';});
 if(control)await check('edge_canary','Deployed firewall blocks the harmless canary path','synthetic_behaviour','The paired application canary route is deliberately denied by the project firewall before its harmless marker is returned. This demonstrates this rule, not coverage of every possible attack.',async()=>{const r=await watchdogHttp('/api/security-watchdog/edge-canary');await r.body?.cancel();return r.status===403;});
}
export async function restoreFixtureFile(runId:string,object:string,image:Buffer){
 const saved=await adminRest('/storage/v1/object/authenticated/course-review-evidence/'+object);if(!saved.ok)throw Error('Backup fixture unavailable');
 const backup=Buffer.from(await saved.arrayBuffer()),digest=createHash('sha256').update(backup).digest('hex');
 if(!backup.equals(image)||!object.startsWith('watchdog-synthetic/'+runId+'/'))throw Error('Backup fixture mismatch');
 const deleted=await adminRest('/storage/v1/object/course-review-evidence',{method:'DELETE',body:JSON.stringify({prefixes:[object]})});if(!deleted.ok)return false;
 const absent=await adminRest('/storage/v1/object/authenticated/course-review-evidence/'+object);if(![400,404].includes(absent.status))return false;
 const restored=await import('@/server/security/provider-fetch').then(m=>m.providerFetch(`https://${process.env.ALP_STAGING_DATABASE_REF}.supabase.co/storage/v1/object/course-review-evidence/${object}`,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY!,authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'content-type':'image/png','x-upsert':'false'},body:backup}));if(!restored.ok)return false;
 const checked=await adminRest('/storage/v1/object/authenticated/course-review-evidence/'+object);
 return checked.ok&&createHash('sha256').update(Buffer.from(await checked.arrayBuffer())).digest('hex')===digest;
}
