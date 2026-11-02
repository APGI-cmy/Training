import 'server-only';
import {randomBytes,randomUUID} from 'node:crypto';
import {assertStagingIsolation,STAGING_DATABASE_REF} from '@/server/environment-isolation';
import {adminRest} from '@/server/supabase/admin-rest';
import {rows,requireCompanyForSession} from '@/server/services/company-structure';
import type {AlpSession} from '@/server/auth/session';
import {WATCHDOG_SUITE,summariseChecks,type WatchdogCheck,type WatchdogPayload,type WatchdogRun} from '@/lib/security-watchdog';
import {watchdogAccess,checkWatchdogScope,watchdogRun,WatchdogError,watchdogActorId,type WatchdogAccess} from './access';
import {watchdogRpc,watchdogPatch,watchdogEvidence,watchdogDashboard} from './store';
import {signWatchdogReport,verifyWatchdogReport,watchdogPublicKey} from './signing';
import {additionalProbes,additionalCheckNames,fixtureObject} from './additional-probes';
import {expectedWatchdogChecks} from '@/lib/watchdog-overview';

type InternalRun=WatchdogRun&{resources:Record<string,unknown>;reused?:boolean};
type TestUser={id:string;session:AlpSession};
const origin=`https://${STAGING_DATABASE_REF}.supabase.co`;
export const watchdogDeployment=()=>process.env.VERCEL_DEPLOYMENT_ID??process.env.VERCEL_URL??'local-development';
export const watchdogCommit=()=>process.env.VERCEL_GIT_COMMIT_SHA??'unknown';
const fixtureEmail=(run:string,index:number)=>`watchdog-${run}-${index}@example.invalid`;

async function publicRequest(path:string,token?:string,body?:unknown){
 assertStagingIsolation();
 const headers:Record<string,string>={apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,'content-type':'application/json'};
 if(token)headers.authorization=`Bearer ${token}`;
 return fetch(origin+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(10000)});
}
async function testRows(user:TestUser,path:string){
 const r=await publicRequest('/rest/v1/'+path,user.session.accessToken);
 if(!r.ok)throw Error('Synthetic access probe unavailable.');
 const value=await r.json();if(!Array.isArray(value))throw Error('Invalid synthetic access result.');return value as Record<string,unknown>[];
}
async function createTestUser(run:string,index:number):Promise<TestUser>{
 const email=fixtureEmail(run,index),password=randomBytes(36).toString('base64url');
 const created=await adminRest('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true,app_metadata:{watchdog_fixture:true,watchdog_run:run}}),signal:AbortSignal.timeout(12000)});
 if(!created.ok)throw Error('Synthetic identity could not be provisioned.');
 const user=await created.json();if(!user.id||user.app_metadata?.watchdog_run!==run)throw Error('Synthetic identity mismatch.');
 const signed=await publicRequest('/auth/v1/token?grant_type=password',undefined,{email,password});
 if(!signed.ok)throw Error('Synthetic sign-in unavailable.');
 const token=await signed.json();if(!token.access_token||token.user?.id!==user.id)throw Error('Synthetic sign-in mismatch.');
 const verified=await publicRequest('/auth/v1/user',token.access_token);
 if(!verified.ok)throw Error('Synthetic identity verification failed.');
 const actual=await verified.json();if(actual.id!==user.id||!actual.email_confirmed_at||actual.app_metadata?.watchdog_run!==run)throw Error('Synthetic identity verification failed.');
 return {id:user.id,session:{accessToken:token.access_token,user:{id:user.id,email:actual.email,email_confirmed_at:actual.email_confirmed_at}}};
}

export async function cleanWatchdogFixtures(runId:string,users:TestUser[]=[]){
 assertStagingIsolation();
 // Revoke known test sessions, then remove only records tagged to this run.
 for(const user of users){try{await fetch(origin+'/auth/v1/logout?scope=global',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${user.session.accessToken}`},signal:AbortSignal.timeout(5000)});}catch{/* Deleting fixtures also removes every scoped data permission. */}}
 const resources=await watchdogRpc<{userIds:string[]}>('v2_watchdog_clean_fixtures',{p_run:runId});
 let complete=true;
 const removed=await adminRest('/storage/v1/object/course-review-evidence',{method:'DELETE',body:JSON.stringify({prefixes:[fixtureObject(runId)]}),signal:AbortSignal.timeout(8000)});
 if(!removed.ok&&removed.status!==404)complete=false;
 for(const id of resources.userIds){
  const r=await adminRest(`/auth/v1/admin/users/${id}`,{method:'DELETE',body:JSON.stringify({should_soft_delete:false}),signal:AbortSignal.timeout(8000)});
  if(!r.ok&&r.status!==404)complete=false;
 }
 await watchdogPatch(runId,{fixtures_cleaned:complete});return complete;
}
export async function cleanInterruptedWatchdogRuns(){
 const cutoff=new Date(Date.now()-180000).toISOString();
 const old=await rows<InternalRun>(`/rest/v1/v2_watchdog_runs?select=id,state,resources&or=(state.eq.cleanup_pending,and(state.eq.running,created_at.lt.${encodeURIComponent(cutoff)}))&order=created_at.asc&limit=5`);
 let cleaned=0;
 for(const r of old){try{if(await cleanWatchdogFixtures(r.id)){await watchdogPatch(r.id,{state:'inconclusive',finished_at:new Date().toISOString()});await watchdogRpc('v2_watchdog_notify',{p_run:r.id});cleaned++;}}catch{/* Keep cleanup_pending visible; next sweep retries. */}}
 return {examined:old.length,cleaned};
}

export async function runSecurityWatchdog(access:WatchdogAccess,scope:string|null,requestId:string,trigger:'manual'|'scheduled'|'deployment'='manual'){
 assertStagingIsolation();checkWatchdogScope(access,scope);watchdogPublicKey();
 const scopeLabel=scope?(await rows<{name:string}>(`/rest/v1/organisations?id=eq.${scope}&is_active=eq.true&select=name&limit=1`))[0]?.name:'Whole platform';
 if(!scopeLabel)throw new WatchdogError('This company is unavailable.');
 await cleanInterruptedWatchdogRuns();
 const run=await watchdogRpc<InternalRun>('v2_watchdog_start',{p_actor:watchdogActorId(access),p_company:scope,p_request:requestId,p_deployment:watchdogDeployment()});
 if(run.payload||run.state!=='running')return run;
 // A repeated in-flight idempotency key must not provision a second fixture set.
 if(run.reused||Object.keys(run.resources??{}).length)throw new WatchdogError('This security test is already running.',409);
 const companyIds=[randomUUID(),randomUUID()];
 await watchdogPatch(run.id,{resources:{companyIds,started:true}});
 const checks:WatchdogCheck[]=[],testUsers:TestUser[]=[];
 const deadline=Date.now()+85000;
 const check=async(id:string,title:string,kind:WatchdogCheck['kind'],detail:string,test:()=>Promise<boolean>,action?:string)=>{
  if(Date.now()>deadline){checks.push({id,title,kind,state:'inconclusive',detail:'The bounded test window expired.',action:'Run this check again.'});return false;}
  try{const ok=await test();checks.push({id,title,kind,state:ok?'passed':'failed',detail,action:ok?undefined:action??'Investigate the boundary and run a fresh verification.'});return ok;}
  catch{checks.push({id,title,kind,state:'inconclusive',detail:'The check could not finish. No pass has been assumed.',action:'Review service availability and retry.'});return false;}
 };
 let cleanup=false;
 try{
  const config=await watchdogRpc<{allPublicTablesRls:boolean;clientDestructiveGrantsPresent:boolean;watchdogRecordsServerOnly:boolean;privateEvidenceBucket:boolean;platformCounts:unknown}>('v2_watchdog_configuration',{p_actor:watchdogActorId(access),p_company:scope});
  checks.push({id:'rls_configuration',title:'Database row-security configuration',kind:'live_configuration',state:config.allPublicTablesRls?'passed':'failed',detail:'Checked whether row-level security is enabled on public-schema tables. This configuration check alone does not prove each policy is correct.'});
  checks.push({id:'destructive_grants',title:'Client database privilege hardening',kind:'live_configuration',state:config.clientDestructiveGrantsPresent?'attention':'passed',detail:config.clientDestructiveGrantsPresent?'Client database roles retain TRUNCATE privileges on some tables. No destructive operation was attempted.':'No client-role TRUNCATE grants were found.',action:config.clientDestructiveGrantsPresent?'Review and remove unnecessary database privileges through a separately tested hardening change.':undefined});
  checks.push({id:'private_storage',title:'Review evidence storage is private',kind:'live_configuration',state:config.privateEvidenceBucket?'passed':'failed',detail:'Checked the privacy setting of the review-evidence bucket. Individual file download paths still need their own checks.'});
  checks.push({id:'report_storage',title:'Security evidence is closed to direct client access',kind:'live_configuration',state:config.watchdogRecordsServerOnly?'passed':'failed',detail:'Reports, evidence and read receipts are available only through verified server-side scope checks.'});
  for(let i=0;i<3;i++)testUsers.push(await createTestUser(run.id,i+1));
  await watchdogRpc('v2_watchdog_seed',{p_run:run.id,p_users:testUsers.map(u=>u.id),p_companies:companyIds});
  const [a,b,c]=testUsers;
  const own=await check('own_profile','Legitimate access to a synthetic own profile','synthetic_behaviour','A normal signed-in test user can read their own fictional profile.',async()=>{const v=await testRows(a,`profiles?user_id=eq.${a.id}&select=user_id`);return v.length===1&&v[0].user_id===a.id;});
  if(own){
   await check('peer_profile','Same-company personal profile privacy','synthetic_behaviour','The owner of synthetic company A cannot read a different synthetic user’s private profile in that same company.',async()=>!(await testRows(a,`profiles?user_id=eq.${c.id}&select=user_id`)).length);
   await check('foreign_profile','Other-company personal profile privacy','synthetic_behaviour','The synthetic company A administrator cannot read the synthetic company B user’s profile.',async()=>!(await testRows(a,`profiles?user_id=eq.${b.id}&select=user_id`)).length);
  }else checks.push({id:'profile_negatives',title:'Profile-denial controls','kind':'synthetic_behaviour',state:'inconclusive',detail:'The legitimate-access control did not pass; denials are not counted as successes.'});
  const ownCompany=await check('own_company','Legitimate company workspace access','synthetic_behaviour','The deployed company guard allows the verified synthetic owner into their own synthetic company.',async()=>(await requireCompanyForSession(companyIds[0],true,a.session)).company.id===companyIds[0]);
  if(ownCompany)await check('foreign_company','Company-to-company workspace separation','synthetic_behaviour','The same deployed company guard blocks the synthetic owner from opening the other synthetic company.',async()=>{try{await requireCompanyForSession(companyIds[1],true,a.session);return false;}catch(e){if(e instanceof Error&&e.message==='You do not have access to this company.')return true;throw e;}});
  const member=await check('own_membership','Legitimate membership access','synthetic_behaviour','The synthetic user can read their own membership through the ordinary authenticated data API.',async()=>(await testRows(a,`organisation_memberships?organisation_id=eq.${companyIds[0]}&user_id=eq.${a.id}&select=user_id`)).length===1);
  if(member)await check('foreign_membership','Other-user membership separation','synthetic_behaviour','The normal authenticated API returns no synthetic company B membership to user A.',async()=>!(await testRows(a,`organisation_memberships?organisation_id=eq.${companyIds[1]}&user_id=eq.${b.id}&select=user_id`)).length);
  const canary=await check('own_canary','Legitimate synthetic canary read','synthetic_behaviour','A normal signed-in user can read only the fictional marker assigned to them.',async()=>(await testRows(a,`v2_watchdog_canaries?run_id=eq.${run.id}&owner_id=eq.${a.id}&select=id,marker`)).length===1);
  if(canary){
   await check('peer_canary','Same-company fictional-record isolation','synthetic_behaviour','A different person’s marker remains private even within the same synthetic company.',async()=>!(await testRows(a,`v2_watchdog_canaries?run_id=eq.${run.id}&owner_id=eq.${c.id}&select=id,marker`)).length);
   await check('foreign_canary','Cross-company fictional-record isolation','synthetic_behaviour','The synthetic foreign-company marker is not returned.',async()=>!(await testRows(a,`v2_watchdog_canaries?run_id=eq.${run.id}&owner_id=eq.${b.id}&select=id,marker`)).length);
  }
  await check('anonymous_canary','Unauthenticated fictional-record access','synthetic_behaviour','An anonymous API request has no permission to select synthetic canary records.',async()=>{const r=await publicRequest(`/rest/v1/v2_watchdog_canaries?run_id=eq.${run.id}&select=id`);return r.status===401||r.status===403;});
  const actorA=await watchdogAccess(a.session);
  await check('watchdog_scope','Customer administrator cannot choose global or foreign scope','synthetic_behaviour','The Watchdog server gate rejects both a platform-wide scope and the other synthetic company.',async()=>{for(const s of [null,companyIds[1]]){try{checkWatchdogScope(actorA,s);return false;}catch(e){if(!(e instanceof WatchdogError)||e.status!==403)throw e;}}return true;});
  await check('watchdog_report','Report/export access is scoped on the server','synthetic_behaviour','A synthetic company administrator cannot retrieve this different-scope security run. JSON and PDF use the same report gate.',async()=>{try{await watchdogRun(actorA,run.id);return false;}catch(e){if(e instanceof WatchdogError&&e.status===404)return true;throw e;}});
  await check('raw_reports','Direct database access cannot bypass report permissions','synthetic_behaviour','A normal authenticated API caller cannot select security report rows directly.',async()=>{const r=await publicRequest(`/rest/v1/v2_watchdog_runs?id=eq.${run.id}&select=id`,a.session.accessToken);return r.status===401||r.status===403;});
  await check('viewer_only','Viewing-only company membership cannot run administrator checks','synthetic_behaviour','The synthetic company learner has no Watchdog administrator access.',async()=>{try{await watchdogAccess(c.session);return false;}catch(e){if(e instanceof WatchdogError&&e.status===403)return true;throw e;}});
  await additionalProbes({runId:run.id,users:testUsers,scope,access,check,checks});
  await check('alarm','In-app test-alarm routing and receipt record','alarm_drill','A labelled drill message is recorded for the initiating administrator and platform principals, and is readable in the initiating administrator’s Watchdog inbox. Email/SMS delivery is not included.',async()=>{await watchdogRpc('v2_watchdog_notify',{p_run:run.id});const dashboard=await watchdogDashboard(access,scope);return dashboard.deliveries.some(d=>d.run_id===run.id);});
 }catch{checks.push({id:'runner',title:'Controlled test execution',state:'inconclusive',kind:'synthetic_behaviour',detail:'The full test sequence could not finish. Completed checks remain recorded; missing checks are not assumed to pass.',action:'Review the run and retry after service availability is restored.'});}
 finally{
  try{cleanup=await cleanWatchdogFixtures(run.id,testUsers);}catch{cleanup=false;}
  checks.push({id:'cleanup',title:'Synthetic identities and fixtures removed',kind:'synthetic_behaviour',state:cleanup?'passed':'failed',detail:cleanup?'The run’s temporary profiles, memberships, companies, canaries and authentication users were removed.':'Cleanup needs attention. The scheduled sweeper will retry only this run’s tagged fixtures.',action:cleanup?undefined:'Keep this run open for follow-up until cleanup is confirmed.'});
 }
 const gaps:[string,string,string][]=[
 ['all_business_paths','Remaining business data paths','All learner records, payments, messages, files, exports, caches and background jobs have not yet been exhaustively exercised. The completed boundary probes are named above.'],
 ['outbound','External information-flow controls','No external exfiltration is attempted. Email recipient, AI-provider, network-egress and external DLP tests require separate controlled adapters.'],
 ['mfa','Provider password and recovery settings','Authenticator enrolment and revoked sessions are tested separately. Compromised-password enforcement, recovery settings and login-rate policy still require provider-setting verification.'],
 ['restore','Backup restoration and recovery','A separate restoration exercise is required; this run does not restore or alter business data.'],
 ['independent','Independent ISO assessment','Organisational risk, policies, staff and supplier controls, independent audit and certification are outside an automated technical test.'],
 ];
 for(const [id,title,detail] of gaps)checks.push({id,title,detail,kind:'manual',state:'not_tested'});
 const stillAllowed=await watchdogRpc<boolean>('v2_watchdog_allowed',{p_actor:watchdogActorId(access),p_company:scope});
 if(!stillAllowed)checks.push({id:'permission_changed',title:'Operator permission changed during the run',kind:'live_configuration',state:'inconclusive',detail:'The operator no longer has access to this scope. Only authorised platform principals can review the retained run.'});
 const manual=stillAllowed?await watchdogEvidence(access,scope).catch(()=>[]):[];
 const completeChecks=expectedWatchdogChecks(checks,[...[{"id":"rls_configuration","title":"Database row-security configuration"},{"id":"destructive_grants","title":"Client database privilege hardening"},{"id":"private_storage","title":"Review evidence storage is private"},{"id":"report_storage","title":"Security evidence storage is protected"},{"id":"own_profile","title":"Legitimate own-profile access"},{"id":"peer_profile","title":"Same-company profile privacy"},{"id":"foreign_profile","title":"Other-company profile privacy"},{"id":"own_company","title":"Legitimate company access"},{"id":"foreign_company","title":"Other-company access denied"},{"id":"own_membership","title":"Own membership access"},{"id":"foreign_membership","title":"Foreign membership privacy"},{"id":"own_canary","title":"Own synthetic record access"},{"id":"peer_canary","title":"Same-company record privacy"},{"id":"foreign_canary","title":"Other-company record privacy"},{"id":"anonymous_canary","title":"Anonymous record access denied"},{"id":"watchdog_scope","title":"Watchdog scope boundaries"},{"id":"watchdog_report","title":"Report and export boundaries"},{"id":"raw_reports","title":"Direct report database bypass denied"},{"id":"viewer_only","title":"Viewing-only role cannot administer"},{"id":"alarm","title":"In-app alarm routing"},{"id":"cleanup","title":"Temporary fixture cleanup"}],...additionalCheckNames]);
 const payload:WatchdogPayload={version:1,runId:run.id,suite:WATCHDOG_SUITE,application:'APGI Training',environment:'v2-staging',scope:{companyId:scope,label:scopeLabel},initiatedBy:watchdogActorId(access),trigger,startedAt:run.created_at,finishedAt:new Date().toISOString(),deployment:run.deployment,commit:watchdogCommit(),policy:'Existing deployed database policies and server company guard; synthetic fixtures only',checks:completeChecks,cleanup,assurance:summariseChecks(completeChecks),limitations:['Point-in-time evidence for the named checks, not proof that information has never leaked.','Synthetic tenants share the isolated V2 staging database; real customer content is not copied into the drill.','In-app alarm routing is exercised. External provider acceptance is reported only when a separate alarm drill has evidence. Provider-wide firewall/log-drain and independent anchoring integrations remain separate.','Canary-specific checks validate their own RLS rules. Existing profiles, membership policies and company server guard are separately exercised.','This report supports ISO-aligned evidence collection; it is not an ISO certificate or a complete assessment.'],manualEvidence:manual.map(e=>({controlId:e.control_id,disposition:e.disposition,reference:e.reference,recordedAt:e.created_at,expiresAt:e.expires_at}))};
 const proof=signWatchdogReport(payload);
 await watchdogPatch(run.id,{payload,proof,state:!cleanup?'cleanup_pending':completeChecks.some(c=>c.state==='inconclusive')?'inconclusive':'finished',finished_at:payload.finishedAt,fixtures_cleaned:cleanup});
 await watchdogRpc('v2_watchdog_notify',{p_run:run.id});
 if(!stillAllowed)throw new WatchdogError('Your access to this company changed during the run. The security record is retained for authorised administrators.');
 const saved=await watchdogRun(access,run.id);
 if(!saved.payload||!saved.proof||!verifyWatchdogReport(saved.payload,saved.proof))throw Error('Saved report integrity check failed.');
 return saved;
}
