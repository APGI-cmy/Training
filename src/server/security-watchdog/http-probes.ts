import 'server-only';
import {courses} from '@/lib/course-catalogue';
import {ACTIVITY_COOKIE} from '@/lib/session-activity';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
import {watchdogRpc} from './store';
import type {AlpSession} from '@/server/auth/session';
import type {Probe} from './additional-probes';

type Identity={id:string;session:AlpSession};
const executive='/courses/Executive%20Assistant%20Training%20Programme/LU1/course/';
export const httpCheckNames=[
 // Company-scoped reports must not disclose other clients' course names/IDs.
 ...courses.map((_c,i)=>({id:'asset_anonymous_'+(i+1),title:'Registered package '+(i+1)+': anonymous access blocked'})),
 {id:'asset_enrolled',title:'Enrolled synthetic learner opens the course package'},
 {id:'asset_nested',title:'Nested course scripts and e-book retain authorised access'},
 {id:'asset_foreign',title:'Unenrolled user cannot reuse an enrolled learner’s file link'},
 {id:'asset_forged',title:'Forged sign-in cookies cannot open course files'},
 {id:'asset_revoked',title:'Revoked enrolment immediately loses direct-file access'},
 {id:'asset_optimizer',title:'Image optimiser cannot bypass course privacy'},
 {id:'download_own',title:'Owner downloads a harmless synthetic attachment'},
 {id:'download_peer',title:'Same-company user cannot download a private message attachment'},
 {id:'download_foreign',title:'Other-company user cannot download a private message attachment'},
 {id:'download_anonymous',title:'Anonymous user cannot download a private message attachment'},
 {id:'export_own',title:'Company owner can export their empty synthetic company report'},
 {id:'export_foreign',title:'Company owner cannot export another company’s payments'},
 {id:'export_platform',title:'Company owner cannot choose whole-platform payment exports'},
 {id:'http_report_foreign',title:'HTTP security-report export denies a foreign-scope administrator'},
 {id:'http_scorm_write',title:'Unenrolled user cannot write learner progress'},
 {id:'http_jobs',title:'All six background-job endpoints reject missing credentials'},
 {id:'http_webhooks',title:'Unsigned email and payment events are rejected'},
 {id:'http_origin',title:'Off-site Watchdog writes are blocked'},
 {id:'http_notifications',title:'Anonymous callers cannot read notification inboxes or receipts'},
 {id:'http_policy',title:'Policy document route requires sign-in'},
 {id:'http_certificate',title:'Certificate download route requires sign-in'},
 {id:'http_account',title:'Account-security details require sign-in'},
 {id:'payment_personal_report',title:'Personal payment exports expose scoped setup metadata'},
 {id:'assurance_learner',title:'Learner assurance omits administrative security records'},
 {id:'assurance_scope',title:'Company assurance refuses other-company diagnostics'},
 {id:'assurance_anonymous',title:'Security assurance requires sign-in'},
];
export function probeCookie(user:Identity){return `alp_access_token=${user.session.accessToken}; alp_user_id=${user.id}; ${ACTIVITY_COOKIE}=${Date.now()}`;}
// Targets are code-owned paths on the fixed staging origin. No arbitrary URL,
// credentials from a real user, redirect following, or customer file is allowed.
export async function watchdogHttp(path:string,user?:Identity,init:RequestInit={}){
 if(!path.startsWith('/')||path.startsWith('//')||/[\\\r\n]/.test(path))throw Error('Invalid security probe target');
 const url=new URL(path,STAGING_ORIGIN);if(url.origin!==STAGING_ORIGIN)throw Error('Invalid security probe origin');
 const headers=new Headers(init.headers);if(user)headers.set('cookie',probeCookie(user));
 return fetch(url,{...init,headers,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});
}
function denied(r:Response){return [401,403,404].includes(r.status)||[303,307].includes(r.status)&&new URL(r.headers.get('location')??'',STAGING_ORIGIN).pathname==='/alp-sign-in';}
const privateResponse=(r:Response)=>/no-store/i.test(r.headers.get('cache-control')??'');
export async function httpProbes({runId,users:[a,b,c],companyIds,check}:{runId:string;users:Identity[];companyIds:string[];check:Probe}){
 const fixture=await watchdogRpc<{messageId:string}>('v2_watchdog_business_fixtures',{p_run:runId,p_operation:'seed'});
 const task=(id:string,title:string,detail:string,test:()=>Promise<boolean>)=>check(id,title,'synthetic_behaviour',detail,test);
 // Independent negative probes run together, with the same bounded per-request
 // timeout. A network error remains inconclusive; it never counts as a denial.
 await Promise.all(courses.map((course,i)=>task('asset_anonymous_'+(i+1),'Registered package '+(i+1)+': anonymous access blocked','An anonymous HEAD request to a registered package must be denied before any course content is returned. Client course identities are not included in this evidence.',async()=>{const unit=course.units[0];const r=await watchdogHttp(unit.scormPath??unit.trainingPath??unit.publishedPath,undefined,{method:'HEAD'});return r.status===403&&privateResponse(r);})));
 const asset=await task('asset_enrolled','Enrolled synthetic learner opens the course package','A freshly enrolled fictional learner receives HTTP 200 for the actual entry point, with private/no-store caching. HEAD reads no course content.',async()=>{const r=await watchdogHttp(executive+'index.html',a,{method:'HEAD'});return r.status===200&&privateResponse(r);});
 if(asset)await Promise.all([
  task('asset_nested','Nested course scripts and e-book retain authorised access','Authorised HEAD requests check a nested script and e-book. File type is never an authentication exemption.',async()=>{for(const file of ['engine.js','ebook.html']){const r=await watchdogHttp(executive+file,a,{method:'HEAD'});if(r.status!==200||!privateResponse(r))return false;}return true;}),
  task('asset_foreign','Unenrolled user cannot reuse an enrolled learner’s file link','The same known entry point is denied to another company’s unenrolled synthetic user.',async()=>(await watchdogHttp(executive+'index.html',b,{method:'HEAD'})).status===403),
  task('asset_forged','Forged sign-in cookies cannot open course files','A real synthetic user ID combined with a made-up access token is rejected.',async()=>(await watchdogHttp(executive+'index.html',{...a,session:{...a.session,accessToken:'watchdog-forged-token'}},{method:'HEAD'})).status===403),
 ]);
 await task('asset_optimizer','Image optimiser cannot bypass course privacy','The public image optimisation endpoint must reject a private course path, even if requested as an image.',async()=>{const r=await watchdogHttp('/_next/image?url='+encodeURIComponent('/courses/vpshr-level-0/LU1 Definition/res/data/thmb1.jpg')+'&w=640&q=75');await r.body?.cancel();return [400,403].includes(r.status);});
 const attachment='/api/messages/attachments/'+fixture.messageId;
 const download=await task('download_own','Owner downloads a harmless synthetic attachment','The owner retrieves the exact run-tagged fictional text marker through the real application download route. No customer attachment is read.',async()=>{const r=await watchdogHttp(attachment,a);return r.ok&&privateResponse(r)&&r.headers.get('x-content-type-options')==='nosniff'&&await r.text()==='WATCHDOG-SYNTHETIC-'+runId;});
 if(download)await Promise.all([
  task('download_peer','Same-company user cannot download a private message attachment','A different user in the same fictional company is denied the known private attachment.',async()=>denied(await watchdogHttp(attachment,c))),
  task('download_foreign','Other-company user cannot download a private message attachment','The known private attachment is denied to a different fictional company.',async()=>denied(await watchdogHttp(attachment,b))),
  task('download_anonymous','Anonymous user cannot download a private message attachment','The known private attachment requires sign-in.',async()=>denied(await watchdogHttp(attachment))),
 ]);
 const ownExport=await task('export_own','Company owner can export their empty synthetic company report','The real CSV route allows the fictional company owner to export an empty company payment report. No financial order or payout is created.',async()=>{const r=await watchdogHttp('/api/payments/reports?scope='+companyIds[0]+'&table=orders',a);const csv=await r.text();return r.ok&&privateResponse(r)&&csv.replace(/^\uFEFF/,'').split('\r\n').length===1&&csv.includes('"buyer_id"');});
 if(ownExport)await Promise.all([
  task('export_foreign','Company owner cannot export another company’s payments','The same real CSV endpoint denies the other fictional company scope.',async()=>(await watchdogHttp('/api/payments/reports?scope='+companyIds[1]+'&table=orders',a)).status===403),
  task('export_platform','Company owner cannot choose whole-platform payment exports','Whole-platform exports remain restricted to authorised principals.',async()=>(await watchdogHttp('/api/payments/reports?scope=all&table=orders',a)).status===403),
 ]);
 await Promise.all([
  task('http_report_foreign','HTTP security-report export denies a foreign-scope administrator','The synthetic company B owner cannot retrieve this existing different-scope security run through the export URL.',async()=>(await watchdogHttp('/api/security-watchdog/runs/'+runId+'/export?format=json',b)).status===404),
  task('http_scorm_write','Unenrolled user cannot write learner progress','An unenrolled fictional user’s write request is rejected before learner records can be changed.',async()=>{const r=await watchdogHttp('/api/scorm',b,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({courseSlug:'executive-assistant-lu1-compatibility',unitSlug:'lu1',attempt:{completion_status:'incomplete'}})});return r.status===401||r.status===403;}),
  task('http_jobs','All six background-job endpoints reject missing credentials','Every configured cron endpoint is requested without credentials. No background job may run.',async()=>{const responses=await Promise.all(['course-deployments','course-reviews','messages','security-watchdog','service-costs','stripe-settlements'].map(job=>watchdogHttp('/api/cron/'+job)));return responses.every(r=>r.status===401);}),
  task('http_webhooks','Unsigned email and payment events are rejected','Harmless empty events without provider signatures must be rejected before processing.',async()=>{const responses=await Promise.all(['/api/email/events','/api/stripe/webhook'].map(path=>watchdogHttp(path,undefined,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})));return responses.every(r=>r.status===400||r.status===401||r.status===403);}),
  task('http_origin','Off-site Watchdog writes are blocked','An off-site request with a valid fictional sign-in must fail the same-origin check before any operation.',async()=>(await watchdogHttp('/api/security-watchdog',a,{method:'POST',headers:{origin:'https://watchdog.example.invalid','content-type':'application/json'},body:'{"operation":"run"}'})).status===403),
  task('http_notifications','Anonymous callers cannot read notification inboxes or receipts','All three notification routes require sign-in and no-store caching before exposing inbox, sent-message or cross-reference metadata. This is an anonymous boundary check, not complete recipient-isolation coverage.',async()=>{const responses=await Promise.all(['/api/notifications','/api/notifications/sent','/api/notifications/targets'].map(p=>watchdogHttp(p)));return responses.every(r=>r.status===401&&privateResponse(r));}),
  task('http_policy','Policy document route requires sign-in','An anonymous request is rejected before policy lookup. The run identifier is a nonexistent document identifier; no real policy is fetched. Authorised policy access and cross-company rules require separate positive and negative controls.',async()=>(await watchdogHttp('/api/policies/'+runId)).status===401),
  task('http_certificate','Certificate download route requires sign-in','An anonymous download request must require sign-in. A generic 404 or transport error is not counted as authentication evidence. No certificate is issued or read.',async()=>{const r=await watchdogHttp('/api/certificates/'+runId);return r.status===401||[303,307].includes(r.status)&&new URL(r.headers.get('location')??'',STAGING_ORIGIN).pathname==='/alp-sign-in';}),
  task('http_account','Account-security details require sign-in','The real account-security GET endpoint requires authentication and private/no-store caching. No factor or recovery operation is attempted.',async()=>{const r=await watchdogHttp('/api/account-security');return r.status===401&&privateResponse(r);}),
  task('payment_personal_report','Personal payment exports expose scoped setup metadata','The fictional owner can export its empty personal setup report. A forged recipient query is ignored; only the allowed setup-status columns are returned. No bank data is created or read.',async()=>{const responses=await Promise.all(['','&user_id='+b.id].map(q=>watchdogHttp('/api/payments/reports?scope=self&table=profiles'+q,a)));for(const r of responses){if(r.status!==200||!privateResponse(r)||(await r.text()).replace(/^\uFEFF/,'')!=='"user_id","country","state","updated_at"')return false;}return true;}),
  task('assurance_learner','Learner assurance omits administrative security records','A signed-in fictional learner receives only the limited assurance projection, with no full platform score, raw checks, findings, actor IDs or company diagnostics.',async()=>{const r=await watchdogHttp('/api/security-assurance',c);if(r.status!==200||!privateResponse(r))return false;const v=await r.json();return v.audience==='learner'&&v.overall===null&&v.reportHref==='/security-assurance'&&!('payload'in v)&&!('proof'in v)&&!('runs'in v);}),
  task('assurance_scope','Company assurance refuses other-company diagnostics','A fictional company owner cannot request whole-platform or the other company assurance report. Only the owner’s current verified scope is permitted.',async()=>{const responses=await Promise.all(['platform',companyIds[1]].map(s=>watchdogHttp('/api/security-assurance?scope='+s,a)));return responses.every(r=>r.status===403&&privateResponse(r));}),
  task('assurance_anonymous','Security assurance requires sign-in','The limited payment assurance endpoint rejects anonymous callers instead of exposing account or technical metadata.',async()=>{const r=await watchdogHttp('/api/security-assurance');return r.status===401&&privateResponse(r);}),
 ]);
 await watchdogRpc('v2_watchdog_business_fixtures',{p_run:runId,p_operation:'revoke'});
 if(asset)await task('asset_revoked','Revoked enrolment immediately loses direct-file access','After the synthetic enrolment is revoked, the previously successful course URL is denied using the same still-live sign-in.',async()=>(await watchdogHttp(executive+'index.html',a,{method:'HEAD'})).status===403);
}
