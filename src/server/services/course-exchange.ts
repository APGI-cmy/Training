import 'server-only';
import {getVercelOidcToken,verifyVercelOidcToken} from '@vercel/oidc';
import {PLATFORM_RELEASE,PLATFORM_TEAM} from '@/lib/platform-release';
import {providerFetch as fetch} from '@/server/security/provider-fetch';
import {rows} from './company-structure';
import {distributionRpc,type Distribution} from './course-distribution';
type Company={id:string;slug:string};
type Share=Pick<Distribution,'course_id'|'source_release_id'|'source_project'|'source_key'|'source_fingerprint'|'source_revision'|'source_actor'|'reason'|'state'|'pricing_snapshot'|'response_due_at'|'withdrawn_at'>&{owner_slug:string;events:unknown[]};
export async function authenticatedExchangePeer(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
 if(!token)throw Error('Verified deployment identity required.');
 const {payload}=await verifyVercelOidcToken(token,{projectId:PLATFORM_RELEASE.targets.map(t=>t.project),ownerId:PLATFORM_TEAM.id,environment:'production',audience:`https://vercel.com/${PLATFORM_TEAM.slug}`,issuer:[`https://oidc.vercel.com/${PLATFORM_TEAM.slug}`,'https://oidc.vercel.com'],maxTokenAge:'65m'});
 const peer=PLATFORM_RELEASE.targets.find(t=>t.project===payload.project_id);
 if(!peer||peer.project===process.env.VERCEL_PROJECT_ID)throw Error('A different registered platform deployment is required.');
 return peer;
}
export async function exportCourseShares(recipientSlug:string,peer:typeof PLATFORM_RELEASE.targets[number]){
 // NKS can read only its own shelf. APGI V2 hosts the APGI and Mediation workspaces.
 const allowed=peer.workspaces;
 if(!allowed.includes(recipientSlug))throw Error('This project cannot read another platform’s course shelf.');
 const companies=await rows<Company>('/rest/v1/organisations?is_active=eq.true&select=id,slug'),company=companies.find(c=>c.slug===recipientSlug);
 if(!company)return [];
 const grants=await rows<Distribution>(`/rest/v1/course_distribution?source_project=eq.${process.env.VERCEL_PROJECT_ID}&recipient_organisation_id=eq.${company.id}&select=*&limit=100`);
 const events=grants.length?await rows<{distribution_id:string;event_key:string;action:string;actor_email:string;reason:string;response_due_at:string|null}>(`/rest/v1/course_distribution_events?distribution_id=in.(${grants.map(g=>g.id).join(',')})&action=in.(offered,concern,final,withdrawn,resolved)&select=distribution_id,event_key,action,actor_email,reason,response_due_at&order=occurred_at.asc`):[];
 return grants.map(g=>({course_id:g.course_id,owner_slug:companies.find(c=>c.id===g.owner_organisation_id)?.slug,source_release_id:g.source_release_id,source_project:g.source_project,source_key:g.source_key,source_fingerprint:g.source_fingerprint,source_revision:g.source_revision,source_actor:g.source_actor,reason:g.reason,state:g.state,pricing_snapshot:g.pricing_snapshot,response_due_at:g.response_due_at,withdrawn_at:g.withdrawn_at,events:events.filter(e=>e.distribution_id===g.id)}));
}
export async function exchangeReports(peer:typeof PLATFORM_RELEASE.targets[number]){
 const grants=await rows<Distribution>(`/rest/v1/course_distribution?source_project=eq.${peer.project}&select=*&limit=100`);
 const ids=grants.map(d=>d.id);if(!ids.length)return {receipts:[],alerts:[]};
 const [decisions,counts]=await Promise.all([
 rows<{distribution_id:string;action:string;actor_email:string;reason:string}>(`/rest/v1/course_distribution_events?distribution_id=in.(${ids.join(',')})&action=in.(accepted,declined)&select=distribution_id,action,actor_email,reason&order=occurred_at.desc`),
 rows<{distribution_id:string;window_start:string;requests:number}>(`/rest/v1/course_distribution_denials?distribution_id=in.(${ids.join(',')})&window_start=gte.${encodeURIComponent(new Date(Date.now()-86400000).toISOString())}&requests=gte.20&select=distribution_id,window_start,requests&limit=100`)
 ]);
 return {receipts:grants.flatMap(g=>{const d=decisions.find(d=>d.distribution_id===g.id);return d?[{key:g.source_key,recipient:g.recipient_organisation_id,accepted:g.accepted_at,declined:g.declined_at,email:d.actor_email,reason:d.reason}]:[];}),alerts:counts.map(c=>({key:grants.find(g=>g.id===c.distribution_id)!.source_key,window:c.window_start,count:c.requests}))};
}
export async function syncCourseShares(){
 const self=PLATFORM_RELEASE.targets.find(t=>t.project===process.env.VERCEL_PROJECT_ID);if(!self)throw Error('Unregistered platform release.');
 const companies=await rows<Company>('/rest/v1/organisations?is_active=eq.true&select=id,slug'),scopes=companies.filter(c=>self.workspaces.includes(c.slug));
 let imported=0;
 for(const peer of PLATFORM_RELEASE.targets.filter(t=>t.project!==self.project))for(const company of scopes){
  const response=await fetch(`${peer.origin}/api/course-exchange?recipient=${encodeURIComponent(company.slug)}`,{headers:{authorization:`Bearer ${await getVercelOidcToken()}`}});
  if(!response.ok)throw Error(`Course sharing exchange is awaiting retry (HTTP ${response.status}).`);
  const payload=await response.json() as {version:string;shares:Share[]};
  if(payload.version!==PLATFORM_RELEASE.version||!Array.isArray(payload.shares)||payload.shares.length>100)throw Error('Platform version drift detected. Deploy the common release before exchanging courses.');
  for(const share of payload.shares){await distributionRpc('v6_import_distribution',{p_project:peer.project,p_recipient:company.id,p_share:share});imported++;}
 }
 // Read only coarse security counters and owner-decision receipts from partners.
 // No learner identities, enrolments, passwords, assessments or progress cross databases.
 for(const peer of PLATFORM_RELEASE.targets.filter(t=>t.project!==self.project)){
  const response=await fetch(`${peer.origin}/api/course-exchange?reports=1`,{headers:{authorization:`Bearer ${await getVercelOidcToken()}`}});
  if(!response.ok)throw Error('Course sharing receipts await retry.');
  const reports=await response.json() as {version:string;receipts:{key:string;recipient:string;accepted:string|null;declined:string|null;email:string;reason:string}[];alerts:{key:string;window:string;count:number}[]};
  if(reports.version!==PLATFORM_RELEASE.version||!Array.isArray(reports.receipts)||!Array.isArray(reports.alerts)||reports.receipts.length>100||reports.alerts.length>100)throw Error('Course receipt version or size mismatch.');
  for(const r of reports.receipts){
   const owned=(await rows<Distribution>(`/rest/v1/course_distribution?source_project=eq.${self.project}&source_key=eq.${encodeURIComponent(r.key)}&select=*&limit=1`))[0];
   const receiver=companies.find(c=>c.id===owned?.recipient_organisation_id);
   if(!owned||!receiver||!peer.workspaces.includes(receiver.slug))continue;
   await distributionRpc('v6_distribution_receipt',{p_key:r.key,p_recipient:receiver.id,p_accepted:r.accepted,p_declined:r.declined,p_email:r.email,p_reason:r.reason});
  }
  for(const a of reports.alerts){const owned=(await rows<Distribution>(`/rest/v1/course_distribution?source_project=eq.${self.project}&source_key=eq.${encodeURIComponent(a.key)}&select=*&limit=1`))[0];if(owned&&peer.workspaces.includes(companies.find(c=>c.id===owned.recipient_organisation_id)?.slug??''))await distributionRpc('v6_distribution_security_alert',{p_key:a.key,p_window:a.window,p_count:a.count});}
 }
 const local=await rows<Distribution>(`/rest/v1/course_distribution?source_project=eq.${self.project}&select=*&limit=100`);
 if(local.length){const counts=await rows<{distribution_id:string;window_start:string;requests:number}>(`/rest/v1/course_distribution_denials?distribution_id=in.(${local.map(d=>d.id).join(',')})&window_start=gte.${encodeURIComponent(new Date(Date.now()-86400000).toISOString())}&requests=gte.20&select=distribution_id,window_start,requests&limit=100`);for(const c of counts)await distributionRpc('v6_distribution_security_alert',{p_key:local.find(d=>d.id===c.distribution_id)!.source_key,p_window:c.window_start,p_count:c.requests});}
 return {version:PLATFORM_RELEASE.version,imported};
}

// The central scheduler can refresh a recipient without enabling that recipient's
// unrelated mail queues. POST performs one local pull only, so it cannot recurse.
export async function refreshRegisteredCourseShares(){
 const result=await syncCourseShares();let peersRefreshed=0;
 for(const peer of PLATFORM_RELEASE.targets.filter(t=>t.project!==process.env.VERCEL_PROJECT_ID)){
  const response=await fetch(`${peer.origin}/api/course-exchange`,{method:'POST',headers:{authorization:`Bearer ${await getVercelOidcToken()}`,'content-type':'application/json'},body:JSON.stringify({action:'refresh',version:PLATFORM_RELEASE.version})});
  if(!response.ok)throw Error(`Partner course refresh awaits retry (HTTP ${response.status}).`);
  const payload=await response.json() as {version:string;refreshed:boolean};
  if(payload.version!==PLATFORM_RELEASE.version||payload.refreshed!==true)throw Error('Partner refresh version mismatch.');
  peersRefreshed++;
 }
 return {...result,peersRefreshed};
}
