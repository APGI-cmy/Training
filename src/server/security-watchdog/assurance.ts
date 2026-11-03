import 'server-only';
import {createHash} from 'node:crypto';
import {getCurrentSession} from '@/server/auth/session';
import {isPlatformPrincipal} from '@/server/services/platform-principals';
import {ownMemberships,rows} from '@/server/services/company-structure';
import {WATCHDOG_SUITE,type WatchdogRun} from '@/lib/security-watchdog';
import {projectAssurance} from '@/lib/security-assurance';
import {WatchdogError,watchdogId,watchdogRunFields} from './access';
import {verifyWatchdogReport} from './signing';
import {watchdogDeployment} from './runner';

export async function securityAssurance(requestedScope?:string){
 const session=await getCurrentSession();
 if(!session)throw new WatchdogError('Sign in to view your security information.',401);
 if(!session.user.email_confirmed_at)throw new WatchdogError('Verify your email first.');
 const [principal,owners]=await Promise.all([isPlatformPrincipal(session),ownMemberships(session,true)]);
 owners.sort((a,b)=>a.organisation_id.localeCompare(b.organisation_id));
 const audience=principal?'principal':owners.length?'company':'learner';
 let scope:string|null=principal?null:owners[0]?.organisation_id??null;
 if(requestedScope){
  if(requestedScope==='platform'){if(!principal)throw new WatchdogError('This security scope is unavailable.');scope=null;}
  else {watchdogId(requestedScope);if(!principal&&!owners.some(m=>m.organisation_id===requestedScope))throw new WatchdogError('This security scope is unavailable.');scope=requestedScope;}
 }
 // Learners receive only a small, shared-platform control projection. No raw
 // report route or company-wide diagnostics are granted by this endpoint.
 const [runs,monitors]=await Promise.all([
  rows<WatchdogRun>(`/rest/v1/v2_watchdog_runs?select=${watchdogRunFields}&company_id=${scope?'eq.'+scope:'is.null'}&order=created_at.desc&limit=3`),
  rows<{enabled:boolean}>(`/rest/v1/v2_watchdog_monitors?select=enabled&scope_key=eq.${scope??'platform'}&limit=1`),
 ]);
 const deployment=watchdogDeployment(),now=Date.now();
 const latest=runs.find(r=>r.deployment===deployment);
 const completed=runs.find(r=>r.payload?.suite===WATCHDOG_SUITE&&r.state==='finished'&&r.deployment===deployment);
 const trusted=!!completed?.payload&&!!completed.proof&&completed.fixtures_cleaned&&completed.payload.runId===completed.id&&completed.payload.scope.companyId===scope&&completed.payload.deployment===deployment&&verifyWatchdogReport(completed.payload,completed.proof);
 const time=Date.parse(completed?.payload?.finishedAt??'');
 const current=trusted&&Number.isFinite(time)&&time<=now&&now-time<=86400000;
 const reportHref=audience==='learner'?'/security-assurance':`/security-watchdog?scope=${scope??'platform'}`;
 return projectAssurance({audience,context:createHash('sha256').update(session.user.id+'|'+(scope??'platform')).digest('hex').slice(0,24),
  event:latest?createHash('sha256').update(latest.id).digest('hex').slice(0,24):null,
  phase:latest?.state==='running'&&now-Date.parse(latest.created_at)<=600000?'running':completed?'finished':'unavailable',payload:completed?.payload??null,trusted,current,reportHref,automatic:monitors[0]?.enabled===true});
}
