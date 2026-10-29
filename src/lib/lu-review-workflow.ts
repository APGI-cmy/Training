import type {ReviewDocument,ReviewFinding,ReviewRound} from './course-review';
import {activeFindings,findingAppliesToUnit} from './course-review';
import {hasReviewTask} from './review-tasks';
import {deemedEndorsementsForFinding,deemedReviewCoversUnit} from './review-nonresponse';
export type FindingDecision={email:string;userId:string;at:string;decision:'accept'|'reopen';reason:string};
export type EndorsementReopen={email:string;userId:string;at:string;reason:string;findingAt:string;fingerprint:string};
export type FindingEndorsement={email:string;userId:string;at:string;decision:'yes'|'no';reason:string;findingAt:string;fingerprint:string};
export type ImplementationRound={id:string;number:number;findingAt:string;fingerprint:string;email:string;userId:string;at:string;implemented:'yes'|'no';notes:string;decision?:FindingDecision;endorsementReopen?:EndorsementReopen;previousDecisions?:FindingDecision[];endorsements:FindingEndorsement[];legacy?:boolean};
export type FindingPhase='Open'|'Reopened'|'Awaiting team review'|'Awaiting endorsement'|'Closed';
export type LUStage='initial'|'implementation'|'reopened'|'endorsements';
export const designerEmail=(d:ReviewDocument)=>d.designerEmail??d.requester;
export function isCourseDesigner(d:ReviewDocument,email:string,userId:string){
 if(email!==designerEmail(d))return false;
 if(email===d.requester)return d.requesterId===userId;
 const person=d.participants.find(p=>p.email===email&&p.state!=='declined');return !!person&&(!person.userId||person.userId===userId);
}
export function contentReviewer(d:ReviewDocument,email:string,userId:string){return d.participants.some(p=>p.email===email&&p.userId===userId&&p.state!=='declined'&&hasReviewTask(p,'content'));}
export function carriedVersion(round:ReviewRound,f:Pick<ReviewFinding,'unit'|'scope'|'fixedFingerprint'|'carriedForwardEvidence'>,from:string){
 if(from===round.fingerprint)return true;
 // A registered correction preserves evidence for explicitly unchanged LUs, including
 // nothing-to-add declarations. Never fabricate a new endorsement or carry one over a changed LU.
 if(f.scope==='course'||!round.document.units.some(u=>u.slug===f.unit))return false;
 let value=from;const seen=new Set<string>();
 while(!seen.has(value)){
  seen.add(value);
  const revisions=(round.document.contentRevisions??[]).filter(r=>r.previousFingerprint===value);
  if(revisions.length){
   if(revisions.length!==1)return false;
   const revision=revisions[0];
   if(!revision.changedUnits||!revision.preservedUnits?.includes(f.unit)||revision.changedUnits.includes(f.unit))return false;
   value=revision.fingerprint;
  }else{
   // Retain older, explicitly registered finding-level carry-forward evidence too.
   if(f.fixedFingerprint!==round.fingerprint)return false;
   const edges=(f.carriedForwardEvidence??[]).filter(e=>e.from===value&&e.unit===f.unit);
   if(edges.length!==1)return false;value=edges[0].to;
  }
  if(value===round.fingerprint)return true;
 }
 return false;
}
export const cleanReviewMessage='No review findings were raised by any of the assigned reviewers. All initial reviews are complete; endorsements are not required.';
function cleanReviewCandidate(round:ReviewRound,unit:string){
 if(round.document.reviewProcessVersion!==3||!round.document.units.some(u=>u.slug===unit))return false;
 const records=round.document.findings.filter(f=>findingAppliesToUnit(f,unit));
 // A correction or a declined endorsement must follow the normal response loop,
 // even if its issue was later superseded by a satisfactory declaration.
 return records.every(f=>f.outcome==='satisfied'&&!f.blocking&&!f.implementationRounds?.length&&!f.fixedBy&&!f.declarationReopen&&!f.workflowEndorsements?.some(e=>e.decision==='no')&&!(f.previousVersions??[]).some(v=>v.outcome!=='satisfied'))
  &&activeFindings(round.document).filter(f=>findingAppliesToUnit(f,unit)).every(f=>!!f.fingerprint&&carriedVersion(round,f,f.fingerprint));
}
export function luCleanReviewComplete(round:ReviewRound,unit:string,recheckPending=false){
 if(recheckPending||!cleanReviewCandidate(round,unit))return false;
 const d=round.document,people=d.participants.filter(p=>p.role==='primary'&&hasReviewTask(p,'content'));
 if(people.length<2||people.some(p=>p.state==='declined'||!p.userId)||new Set(people.map(p=>p.userId)).size!==people.length||new Set(people.map(p=>p.email)).size!==people.length)return false;
 const complete=(slug:string)=>cleanReviewCandidate(round,slug)&&people.every(p=>p.coverage.includes(slug)&&activeFindings(d).some(f=>findingAppliesToUnit(f,slug)&&f.author===p.email&&f.userId===p.userId&&f.outcome==='satisfied'&&!!f.fingerprint&&carriedVersion(round,f,f.fingerprint)));
 // A course-wide declaration is one shared record; waive its endorsement only
 // once the team has finished every LU to which that declaration applies.
 return complete(unit)&&(!activeFindings(d).some(f=>f.scope==='course')||d.units.every(u=>complete(u.slug)));
}
export function cleanReviewComplete(round:ReviewRound){return round.document.units.length>0&&round.document.units.every(u=>luCleanReviewComplete(round,u.slug));}
export function cleanReviewDeclarationComplete(round:ReviewRound,f:ReviewFinding){return f.outcome==='satisfied'&&(f.scope==='course'?cleanReviewComplete(round):luCleanReviewComplete(round,f.unit));}
export function implementationRounds(round:ReviewRound,f:ReviewFinding):ImplementationRound[]{
 const saved=f.implementationRounds??[];
 if(saved.length)return saved.filter(r=>r.findingAt===f.at&&carriedVersion(round,f,r.fingerprint)).map(r=>r.fingerprint===round.fingerprint?r:{...r,fingerprint:round.fingerprint,endorsements:r.endorsements.map(e=>carriedVersion(round,f,e.fingerprint)?{...e,fingerprint:round.fingerprint}:e)});
 // Preserve a previously recorded implementation without inventing a new acceptance.
 if(!f.fixedBy||!f.fixedAt||!f.fixedFingerprint||f.fixedFingerprint!==round.fingerprint)return [];
 const reply=[...f.replies].reverse().find(r=>r.userId===f.fixedBy&&/^fixed\s*·/.test(r.text));
 return [{id:`legacy-${f.id}`,number:1,findingAt:f.at,fingerprint:f.fixedFingerprint,email:round.document.participants.find(p=>p.userId===f.fixedBy)?.email??designerEmail(round.document),userId:f.fixedBy,at:f.fixedAt,implemented:'yes',notes:reply?.text??'Earlier implementation record retained.',endorsements:[],legacy:true}];
}
function materializeImplementationRounds(round:ReviewRound,f:ReviewFinding){const effective=implementationRounds(round,f);f.implementationRounds=f.implementationRounds?.length?f.implementationRounds.map(old=>effective.find(r=>r.id===old.id)??old):effective;}
export function currentImplementation(round:ReviewRound,f:ReviewFinding){const r=implementationRounds(round,f).at(-1);return r&&r.findingAt===f.at&&r.fingerprint===round.fingerprint?r:undefined;}
export function currentEndorsements(round:ReviewRound,f:ReviewFinding){return (f.outcome==='satisfied'?f.workflowEndorsements??[]:currentImplementation(round,f)?.endorsements??[]).filter(e=>e.findingAt===f.at&&carriedVersion(round,f,e.fingerprint)).map(e=>e.fingerprint===round.fingerprint?e:{...e,fingerprint:round.fingerprint});}
function independentEndorser(round:ReviewRound,f:ReviewFinding,email:string,userId:string){const writer=f.outcome==='satisfied'?{email:f.author,userId:f.userId}:currentImplementation(round,f);return !!writer&&writer.email!==email&&writer.userId!==userId;}
export function hasPeerEndorsement(round:ReviewRound,f:ReviewFinding){
 const response=currentImplementation(round,f);
 // Retain completed checks from the former two-decision process; new responses use endorsement alone.
 const priorAcceptance=response?.decision?.decision==='accept'&&response.decision.email===f.author&&response.decision.userId===f.userId&&response.userId!==f.userId&&contentReviewer(round.document,f.author,f.userId);
 return currentEndorsements(round,f).some(e=>e.decision==='yes'&&contentReviewer(round.document,e.email,e.userId)&&(independentEndorser(round,f,e.email,e.userId)||priorAcceptance&&e.email!==f.author&&e.userId!==f.userId));
}
export function retainedClosure(round:ReviewRound,f:ReviewFinding){const verifier=round.document.participants.find(p=>p.userId===f.verifiedBy);return !f.implementationRounds?.length&&f.outcome!=='satisfied'&&f.status==='closed'&&!!f.fixedBy&&!!f.verifiedBy&&f.verifiedBy!==f.fixedBy&&f.fixedFingerprint===round.fingerprint&&f.verifiedFingerprint===round.fingerprint&&!!verifier&&contentReviewer(round.document,verifier.email,f.verifiedBy);}
export function findingPhase(round:ReviewRound,f:ReviewFinding):FindingPhase{
 if(retainedClosure(round,f))return 'Closed';
 if(f.outcome==='satisfied')return f.declarationReopen&&f.declarationReopen.findingAt===f.at&&carriedVersion(round,f,f.declarationReopen.fingerprint)?'Reopened':hasPeerEndorsement(round,f)||cleanReviewDeclarationComplete(round,f)||deemedEndorsementsForFinding(round,f).length?'Closed':cleanReviewCandidate(round,f.unit)?'Awaiting team review':'Awaiting endorsement';
 const r=currentImplementation(round,f);if(!r)return 'Open';
 if(r.decision?.decision==='reopen'||r.endorsementReopen)return 'Reopened';
 return hasPeerEndorsement(round,f)||deemedEndorsementsForFinding(round,f).length?'Closed':'Awaiting endorsement';
}
export function canImplement(round:ReviewRound,f:ReviewFinding,email:string,userId:string){return isCourseDesigner(round.document,email,userId)&&f.outcome!=='satisfied'&&['Open','Reopened'].includes(findingPhase(round,f));}
function eligibleContentReviewer(d:ReviewDocument,email:string,userId:string){return d.participants.some(p=>p.email===email&&(!p.userId||p.userId===userId)&&p.state!=='declined'&&hasReviewTask(p,'content'));}
export function canEndorseFinding(round:ReviewRound,f:ReviewFinding,email:string,userId:string){return findingPhase(round,f)==='Awaiting endorsement'&&independentEndorser(round,f,email,userId)&&eligibleContentReviewer(round.document,email,userId)&&!currentEndorsements(round,f).some(e=>e.userId===userId);}
export function submitImplementation(round:ReviewRound,f:ReviewFinding,actor:{email:string;userId:string},input:{id:string;at:string;implemented:'yes'|'no';notes:string}){
 if(!canImplement(round,f,actor.email,actor.userId))throw Error('Only the assigned course designer may respond to an open or reopened finding. Wait for a No endorsement to reopen it before submitting another response.');
 if(!['yes','no'].includes(input.implemented)||input.notes.trim().length<5)throw Error('Explain the implemented correction, or the reason for no change.');
 const rounds=implementationRounds(round,f);f.implementationRounds=[...(f.implementationRounds??rounds),{...actor,...input,notes:input.notes.trim(),number:(rounds.at(-1)?.number??0)+1,findingAt:f.at,fingerprint:round.fingerprint,endorsements:[]}];
 f.status='fixed';f.fixedBy=actor.userId;f.fixedAt=input.at;f.fixedFingerprint=round.fingerprint;delete f.verifiedBy;delete f.verifiedAt;delete f.verifiedFingerprint;
}
export function endorseFinding(round:ReviewRound,f:ReviewFinding,actor:{email:string;userId:string},input:{at:string;decision:'yes'|'no';reason:string}){
 if(cleanReviewDeclarationComplete(round,f))throw Error('No endorsement is required: every assigned full reviewer completed the initial review with no findings. Open the LU and save a finding if something needs changing.');
 if(!canEndorseFinding(round,f,actor.email,actor.userId))throw Error('One assigned reviewer other than the implementation writer may endorse the response. You cannot endorse your own implementation or review declaration, or a record already closed.');
 if(!['yes','no'].includes(input.decision)||input.decision==='no'&&input.reason.trim().length<5)throw Error('Give a reason for not endorsing this record.');
 const entry={...actor,...input,reason:input.reason.trim(),findingAt:f.at,fingerprint:round.fingerprint};
 if(f.outcome==='satisfied')f.workflowEndorsements=[...(f.workflowEndorsements??[]),entry];else {materializeImplementationRounds(round,f);currentImplementation(round,f)!.endorsements.push(entry);}
 if(input.decision==='no'){
  const reopen={...actor,at:input.at,reason:input.reason.trim(),findingAt:f.at,fingerprint:round.fingerprint};
  if(f.outcome==='satisfied')f.declarationReopen=reopen;else currentImplementation(round,f)!.endorsementReopen=reopen;
  f.status='open';delete f.verifiedBy;delete f.verifiedAt;delete f.verifiedFingerprint;
 }
 if(input.decision==='yes'){
  f.status='closed';f.verifiedBy=entry.userId;f.verifiedAt=entry.at;f.verifiedFingerprint=round.fingerprint;
 }
}
export function reopenOwnFinding(round:ReviewRound,f:ReviewFinding,actor:{email:string;userId:string},at:string,reason:string){
 if(!(isCourseDesigner(round.document,actor.email,actor.userId)||contentReviewer(round.document,actor.email,actor.userId))||f.author!==actor.email||f.userId!==actor.userId||!['Closed','Awaiting endorsement'].includes(findingPhase(round,f)))throw Error('Only the finding author may reopen their own submitted finding.');
 if(reason.trim().length<5)throw Error('Explain why the finding needs a further correction.');
 materializeImplementationRounds(round,f);const r=currentImplementation(round,f);if(!r)throw Error('Record an implementation before reopening it.');if(r.decision)r.previousDecisions=[...(r.previousDecisions??[]),r.decision];r.decision={...actor,at,decision:'reopen',reason:reason.trim()};f.status='open';delete f.verifiedBy;delete f.verifiedAt;delete f.verifiedFingerprint;
}
export function luInitialReviewProgress(round:ReviewRound,unit:string,recheckPending=false){
 const findings=activeFindings(round.document).filter(f=>findingAppliesToUnit(f,unit));
 return round.document.participants.filter(p=>p.role==='primary'&&p.state!=='declined'&&hasReviewTask(p,'content')).map(p=>{
   const coverage=!recheckPending&&p.coverage.includes(unit),recorded=findings.some(f=>f.author===p.email),deemed=!recheckPending&&deemedReviewCoversUnit(round,p.email,unit);
  return {email:p.email,coverage,recorded,...(deemed?{deemed:true}:{}),complete:deemed||coverage&&recorded};
 });
}
export function luReviewStages(round:ReviewRound,unit:string,recheckPending=false){
 const d=round.document,findings=activeFindings(d).filter(f=>findingAppliesToUnit(f,unit));
 const reviewers=luInitialReviewProgress(round,unit,recheckPending);
 const initialComplete=reviewers.length>=2&&reviewers.every(p=>p.complete),emptyDeemed=initialComplete&&reviewers.some(p=>p.deemed)&&findings.length===0;
 const reopens=findings.flatMap(f=>f.outcome==='satisfied'&&findingPhase(round,f)==='Reopened'?[{findingId:f.id,number:1}]:implementationRounds(round,f).filter(r=>r.decision?.decision==='reopen'||r.endorsementReopen).map(r=>({findingId:f.id,number:r.number})));
 return [{id:'initial' as const,label:'Initial review',done:initialComplete},
 {id:'implementation' as const,label:'Implementation feedback',done:emptyDeemed||findings.length>0&&findings.every(f=>f.outcome==='satisfied'||retainedClosure(round,f)||!!implementationRounds(round,f)[0])},
 {id:'reopened' as const,label:'Reopened rounds',done:reopens.every(x=>['Closed','Awaiting endorsement'].includes(findingPhase(round,findings.find(f=>f.id===x.findingId)!))),rounds:[...new Set(reopens.map(r=>r.number))].sort((a,b)=>a-b)},
 {id:'endorsements' as const,label:'Endorsements',done:emptyDeemed||findings.length>0&&findings.every(f=>findingPhase(round,f)==='Closed')}];
}
export function initialReviewerComplete(round:ReviewRound,email:string){if(!round.document.participants.some(p=>p.email===email&&p.role==='primary'&&p.state!=='declined'&&hasReviewTask(p,'content')))return false;return round.document.units.every(u=>luInitialReviewProgress(round,u.slug).some(p=>p.email===email&&p.complete));}
export function reviewerContentComplete(round:ReviewRound,email:string){
 const d=round.document,p=d.participants.find(p=>p.email===email);if(!p||p.state==='declined')return false;
 if(p.role==='peer'&&(cleanReviewComplete(round)||d.units.some(u=>deemedReviewCoversUnit(round,email,u.slug))))return true;
 if(d.units.length>0&&d.units.every(u=>deemedReviewCoversUnit(round,email,u.slug))&&activeFindings(d).filter(f=>f.author===email).every(f=>findingPhase(round,f)==='Closed'))return true;
 if(!p.userId)return false;
 const all=activeFindings(d),own=all.filter(f=>f.author===email);
 if(p.role==='peer')return all.some(f=>currentEndorsements(round,f).some(e=>e.userId===p.userId));
 return d.units.every(u=>deemedReviewCoversUnit(round,email,u.slug)||p.coverage.includes(u.slug)&&own.some(f=>findingAppliesToUnit(f,u.slug)))&&own.every(f=>findingPhase(round,f)==='Closed');
}
export function luWorkflowBlockers(round:ReviewRound){
 const d=round.document,issues:string[]=[];
 for(const p of d.participants.filter(p=>p.role==='primary'&&p.state!=='declined'&&hasReviewTask(p,'content'))){const missing=d.units.filter(u=>!p.coverage.includes(u.slug)&&!deemedReviewCoversUnit(round,p.email,u.slug));if(missing.length)issues.push(`${p.email}: ${missing.length} LU review confirmations outstanding.`);const absent=d.units.filter(u=>!deemedReviewCoversUnit(round,p.email,u.slug)&&!activeFindings(d).some(f=>f.author===p.email&&findingAppliesToUnit(f,u.slug)));if(absent.length)issues.push(`${p.email}: ${absent.length} LUs need a finding or nothing-to-add declaration.`);}
 const pending=activeFindings(d).filter(f=>findingPhase(round,f)!=='Closed');if(pending.length)issues.push(`${pending.length} findings or review declarations still need an implementation response or one additional endorsement.`);
 return issues;
}
