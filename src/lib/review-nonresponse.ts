import type {ReviewRound,ReviewFinding} from './course-review';
import {activeFindings,findingAppliesToUnit} from './course-review';
import {carriedVersion,currentImplementation,canEndorseFinding} from './lu-review-workflow';
import {hasReviewTask} from './review-tasks';
export type ReviewNonresponsePolicy={version:1;days:7;enabledAt:string;enabledBy:string;roundId:string};
export type DeemedEndorsement={requestId:string;kind:'initial'|'endorsement';recipient:string;fingerprint:string;units:string[];notifiedAt:string;dueAt:string;at:string;findingId?:string;findingAt?:string;responseId?:string};
export type ResponseRequest={key:string;kind:'initial'|'endorsement';recipient:string;fingerprint:string;units:string[];requestedAt:string;findingId?:string;findingAt?:string;responseId?:string;requirement:string;anchor:string};
export const reviewNonresponseNotice='Seven-day response rule: if you do not respond to this course content review invitation or an endorsement request within seven calendar days of its successfully sent notice, the platform records a “Deemed endorsement — no response” and notifies you. The review cutoff is extended if necessary to give you the full seven-day response window. Only responses recorded on the platform stop the timer; reading the email alone does not. This is not recorded as an actual review or a personal approval. Unimplemented findings, commercial terms, branding approvals and final publication are not approved automatically.';
function valid(round:ReviewRound,e:DeemedEndorsement){const policy=round.document.nonresponsePolicy;return policy?.version===1&&policy.days===7&&policy.roundId===round.id&&Date.parse(e.notifiedAt)>=Date.parse(policy.enabledAt)&&Date.parse(e.dueAt)>=Date.parse(e.notifiedAt)+7*86400000&&Date.parse(e.at)>=Date.parse(e.dueAt)&&round.document.participants.some(p=>p.email===e.recipient&&p.state!=='declined'&&hasReviewTask(p,'content'));}
function covers(round:ReviewRound,e:DeemedEndorsement,unit:string){return valid(round,e)&&e.units.includes(unit)&&carriedVersion(round,{unit,scope:'current'},e.fingerprint);}
function matches(round:ReviewRound,e:DeemedEndorsement,f:ReviewFinding){
 if(f.scope==='course'?!round.document.units.every(u=>covers(round,e,u.slug)):!covers(round,e,f.unit))return false;
 if(f.declarationReopen?.findingAt===f.at&&carriedVersion(round,f,f.declarationReopen.fingerprint))return false;
 const response=currentImplementation(round,f);if(response?.decision?.decision==='reopen'||response?.endorsementReopen)return false;
 const writer=f.outcome==='satisfied'?f.author:response?.email,writerId=f.outcome==='satisfied'?f.userId:response?.userId,person=round.document.participants.find(p=>p.email===e.recipient);if(!writer||writer===e.recipient||person?.userId&&person.userId===writerId)return false;
 if(e.kind==='initial')return f.outcome==='satisfied'&&Date.parse(f.at)<=Date.parse(e.at);
 return e.findingId===f.id&&e.findingAt===f.at&&(e.responseId??'')===(response?.id??'');
}
export function deemedEndorsementsForFinding(round:ReviewRound,f:ReviewFinding){return (round.document.deemedEndorsements??[]).filter(e=>matches(round,e,f));}
export function deemedEntryAppliesToUnit(round:ReviewRound,e:DeemedEndorsement,unit:string){return covers(round,e,unit)&&(e.kind==='initial'||activeFindings(round.document).some(f=>findingAppliesToUnit(f,unit)&&matches(round,e,f)));}
export function deemedReviewCoversUnit(round:ReviewRound,email:string,unit:string){return (round.document.deemedEndorsements??[]).some(e=>e.recipient===email&&deemedEntryAppliesToUnit(round,e,unit));}
export function hasInitialReviewResponse(round:ReviewRound,email:string){const p=round.document.participants.find(p=>p.email===email);return !p||p.state==='declined'||p.coverage.length>0||round.document.findings.some(f=>f.author===email||f.replies.some(r=>r.email===email))||(round.document.requests??[]).some(r=>r.requestedBy===email);}
export function reviewResponseRequests(round:ReviewRound):ResponseRequest[]{
 if(round.document.reviewProcessVersion!==3||round.document.nonresponsePolicy?.version!==1||round.status!=='open')return [];
 const list:ResponseRequest[]=[];
 const initialAt=[round.document.nonresponsePolicy.enabledAt,round.created_at,round.document.contentRevisions?.at(-1)?.at].filter((at):at is string=>!!at).sort((a,b)=>Date.parse(b)-Date.parse(a))[0];
 for(const p of round.document.participants.filter(p=>p.state!=='declined'&&hasReviewTask(p,'content'))){
  if(p.role==='primary'&&!hasInitialReviewResponse(round,p.email)&&!round.document.units.every(u=>deemedReviewCoversUnit(round,p.email,u.slug)))list.push({key:`initial:${round.fingerprint}:${p.email}`,kind:'initial',recipient:p.email,fingerprint:round.fingerprint,units:round.document.units.map(u=>u.slug),requestedAt:initialAt,anchor:'review-process',requirement:'Open the course and complete your initial review. A discussion reply, saved finding, coverage confirmation or review change request recorded on the platform is a response; merely opening an email is not.'});
  for(const f of activeFindings(round.document))if(canEndorseFinding(round,f,p.email,p.userId??p.email)){
   const response=currentImplementation(round,f);list.push({key:`endorsement:${f.id}:${f.at}:${response?.id??'declaration'}:${round.fingerprint}:${p.email}`,kind:'endorsement',recipient:p.email,fingerprint:round.fingerprint,units:f.scope==='course'?round.document.units.map(u=>u.slug):[f.unit],requestedAt:response?.at??f.at,findingId:f.id,findingAt:f.at,responseId:response?.id,anchor:`finding-${f.id}`,requirement:`${f.unit.toUpperCase()} · ${f.reference}: read ${response?`Implementation notes (${response.number})`:'the saved review declaration'} and select Yes—endorse or No—do not endorse with a reason.`});
  }
 }
 return list;
}
