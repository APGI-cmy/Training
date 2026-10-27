import type {ReviewDocument,ReviewFinding,ReviewRound} from './course-review';
import {activeFindings,findingAppliesToUnit} from './course-review';
import {hasReviewTask} from './review-tasks';
export type FindingDecision={email:string;userId:string;at:string;decision:'accept'|'reopen';reason:string};
export type FindingEndorsement={email:string;userId:string;at:string;decision:'yes'|'no';reason:string;findingAt:string;fingerprint:string};
export type ImplementationRound={id:string;number:number;findingAt:string;fingerprint:string;email:string;userId:string;at:string;implemented:'yes'|'no';notes:string;decision?:FindingDecision;previousDecisions?:FindingDecision[];endorsements:FindingEndorsement[];legacy?:boolean};
export type FindingPhase='Open'|'Reopened'|'Awaiting reviewer decision'|'Awaiting endorsement'|'Closed';
export type LUStage='initial'|'implementation'|'reopened'|'endorsements';
export const designerEmail=(d:ReviewDocument)=>d.designerEmail??d.requester;
export function isCourseDesigner(d:ReviewDocument,email:string,userId:string){
 if(email!==designerEmail(d))return false;
 const bound=email===d.requester?d.requesterId:d.participants.find(p=>p.email===email)?.userId;
 return !!bound&&bound===userId;
}
export function contentReviewer(d:ReviewDocument,email:string,userId:string){return d.participants.some(p=>p.email===email&&p.userId===userId&&p.state!=='declined'&&hasReviewTask(p,'content'));}
export function carriedVersion(round:ReviewRound,f:ReviewFinding,from:string){
 if(from===round.fingerprint)return true;if(f.fixedFingerprint!==round.fingerprint)return false;
 const edges=f.carriedForwardEvidence??[];let value=from;const seen=new Set<string>();while(!seen.has(value)){seen.add(value);const edge=edges.find(e=>e.from===value);if(!edge)return false;value=edge.to;if(value===round.fingerprint)return true;}return false;
}
export function implementationRounds(round:ReviewRound,f:ReviewFinding):ImplementationRound[]{
 const saved=f.implementationRounds??[];
 if(saved.length)return saved.filter(r=>r.findingAt===f.at&&carriedVersion(round,f,r.fingerprint)).map(r=>r.fingerprint===round.fingerprint?r:{...r,fingerprint:round.fingerprint,endorsements:r.endorsements.map(e=>({...e,fingerprint:round.fingerprint}))});
 // Preserve a previously recorded implementation without inventing a new acceptance.
 if(!f.fixedBy||!f.fixedAt||!f.fixedFingerprint||f.fixedFingerprint!==round.fingerprint)return [];
 const reply=[...f.replies].reverse().find(r=>r.userId===f.fixedBy&&/^fixed\s*·/.test(r.text));
 return [{id:`legacy-${f.id}`,number:1,findingAt:f.at,fingerprint:f.fixedFingerprint,email:round.document.participants.find(p=>p.userId===f.fixedBy)?.email??designerEmail(round.document),userId:f.fixedBy,at:f.fixedAt,implemented:'yes',notes:reply?.text??'Earlier implementation record retained.',endorsements:[],legacy:true}];
}
function materializeImplementationRounds(round:ReviewRound,f:ReviewFinding){const effective=implementationRounds(round,f);f.implementationRounds=f.implementationRounds?.length?f.implementationRounds.map(old=>effective.find(r=>r.id===old.id)??old):effective;}
export function currentImplementation(round:ReviewRound,f:ReviewFinding){const r=implementationRounds(round,f).at(-1);return r&&r.findingAt===f.at&&r.fingerprint===round.fingerprint?r:undefined;}
export function currentEndorsements(round:ReviewRound,f:ReviewFinding){return (f.outcome==='satisfied'?f.workflowEndorsements??[]:currentImplementation(round,f)?.endorsements??[]).filter(e=>e.findingAt===f.at&&e.fingerprint===round.fingerprint);}
export function hasPeerEndorsement(round:ReviewRound,f:ReviewFinding){return currentEndorsements(round,f).some(e=>e.decision==='yes'&&e.email!==f.author&&e.userId!==f.userId&&contentReviewer(round.document,e.email,e.userId));}
export function retainedClosure(round:ReviewRound,f:ReviewFinding){return !f.implementationRounds?.length&&f.outcome!=='satisfied'&&f.status==='closed'&&!!f.verifiedBy&&f.verifiedBy!==f.fixedBy&&f.verifiedFingerprint===round.fingerprint;}
export function findingPhase(round:ReviewRound,f:ReviewFinding):FindingPhase{
 if(retainedClosure(round,f))return 'Closed';
 if(f.outcome==='satisfied')return hasPeerEndorsement(round,f)?'Closed':'Awaiting endorsement';
 const r=currentImplementation(round,f);if(!r)return 'Open';
 if(r.decision?.decision==='reopen')return 'Reopened';
 if(f.userId!==r.userId&&r.decision?.decision!=='accept')return 'Awaiting reviewer decision';
 return hasPeerEndorsement(round,f)?'Closed':'Awaiting endorsement';
}
export function canImplement(round:ReviewRound,f:ReviewFinding,email:string,userId:string){return isCourseDesigner(round.document,email,userId)&&f.outcome!=='satisfied'&&['Open','Reopened'].includes(findingPhase(round,f));}
export function canDecideImplementation(round:ReviewRound,f:ReviewFinding,email:string,userId:string){const r=currentImplementation(round,f);return findingPhase(round,f)==='Awaiting reviewer decision'&&f.author===email&&f.userId===userId&&r?.userId!==userId&&contentReviewer(round.document,email,userId);}
export function canEndorseFinding(round:ReviewRound,f:ReviewFinding,email:string,userId:string){return findingPhase(round,f)==='Awaiting endorsement'&&f.author!==email&&f.userId!==userId&&contentReviewer(round.document,email,userId)&&!currentEndorsements(round,f).some(e=>e.userId===userId);}
export function submitImplementation(round:ReviewRound,f:ReviewFinding,actor:{email:string;userId:string},input:{id:string;at:string;implemented:'yes'|'no';notes:string}){
 if(!canImplement(round,f,actor.email,actor.userId))throw Error('Only the assigned course designer may respond to an open or reopened finding. Wait for the reviewer decision before submitting another response.');
 if(!['yes','no'].includes(input.implemented)||input.notes.trim().length<5)throw Error('Explain the implemented correction, or the reason for no change.');
 const rounds=implementationRounds(round,f);f.implementationRounds=[...(f.implementationRounds??rounds),{...actor,...input,notes:input.notes.trim(),number:(rounds.at(-1)?.number??0)+1,findingAt:f.at,fingerprint:round.fingerprint,endorsements:[]}];
 f.status='fixed';f.fixedBy=actor.userId;f.fixedAt=input.at;f.fixedFingerprint=round.fingerprint;delete f.verifiedBy;delete f.verifiedAt;delete f.verifiedFingerprint;
}
export function decideImplementation(round:ReviewRound,f:ReviewFinding,actor:{email:string;userId:string},input:{at:string;decision:'accept'|'reopen';reason:string}){
 if(!canDecideImplementation(round,f,actor.email,actor.userId))throw Error('Only the original reviewer may decide on this submitted implementation response.');
 if(!['accept','reopen'].includes(input.decision)||input.decision==='reopen'&&input.reason.trim().length<5)throw Error('Give a reason for rejecting and reopening this response.');
 materializeImplementationRounds(round,f);const r=currentImplementation(round,f)!;r.decision={...actor,...input,reason:input.reason.trim()};f.status=input.decision==='reopen'?'open':'fixed';
}
export function endorseFinding(round:ReviewRound,f:ReviewFinding,actor:{email:string;userId:string},input:{at:string;decision:'yes'|'no';reason:string}){
 if(!canEndorseFinding(round,f,actor.email,actor.userId))throw Error('One different assigned reviewer may endorse the completed record. You cannot endorse your own finding, or a record already closed.');
 if(!['yes','no'].includes(input.decision)||input.decision==='no'&&input.reason.trim().length<5)throw Error('Give a reason for not endorsing this record.');
 const entry={...actor,...input,reason:input.reason.trim(),findingAt:f.at,fingerprint:round.fingerprint};
 if(f.outcome==='satisfied')f.workflowEndorsements=[...(f.workflowEndorsements??[]),entry];else {materializeImplementationRounds(round,f);currentImplementation(round,f)!.endorsements.push(entry);}
 if(input.decision==='yes'){
  f.status='closed';const r=currentImplementation(round,f),verification=r?.decision?.decision==='accept'&&r.decision.userId!==r.userId?r.decision:entry;
  f.verifiedBy=verification.userId;f.verifiedAt=verification.at;f.verifiedFingerprint=round.fingerprint;
 }
}
export function reopenOwnFinding(round:ReviewRound,f:ReviewFinding,actor:{email:string;userId:string},at:string,reason:string){
 if(!(isCourseDesigner(round.document,actor.email,actor.userId)||contentReviewer(round.document,actor.email,actor.userId))||f.author!==actor.email||f.userId!==actor.userId||!['Closed','Awaiting endorsement'].includes(findingPhase(round,f)))throw Error('Only the finding author may reopen their own submitted finding.');
 if(reason.trim().length<5)throw Error('Explain why the finding needs a further correction.');
 materializeImplementationRounds(round,f);const r=currentImplementation(round,f);if(!r)throw Error('Record an implementation before reopening it.');if(r.decision)r.previousDecisions=[...(r.previousDecisions??[]),r.decision];r.decision={...actor,at,decision:'reopen',reason:reason.trim()};f.status='open';delete f.verifiedBy;delete f.verifiedAt;delete f.verifiedFingerprint;
}
export function luReviewStages(round:ReviewRound,unit:string){
 const d=round.document,findings=activeFindings(d).filter(f=>findingAppliesToUnit(f,unit));
 const reviewers=d.participants.filter(p=>p.role==='primary'&&p.state!=='declined'&&hasReviewTask(p,'content'));
 const reopens=findings.flatMap(f=>implementationRounds(round,f).filter(r=>r.decision?.decision==='reopen').map(r=>({findingId:f.id,number:r.number})));
 return [{id:'initial' as const,label:'Initial review',done:reviewers.length>=2&&reviewers.every(p=>p.coverage.includes(unit))},
 {id:'implementation' as const,label:'Implementation feedback',done:findings.length>0&&findings.every(f=>f.outcome==='satisfied'||retainedClosure(round,f)||!!implementationRounds(round,f)[0]&&(implementationRounds(round,f)[0].userId===f.userId||!!implementationRounds(round,f)[0].decision))},
 {id:'reopened' as const,label:'Reopened rounds',done:reopens.every(x=>['Closed','Awaiting endorsement'].includes(findingPhase(round,findings.find(f=>f.id===x.findingId)!))),rounds:[...new Set(reopens.map(r=>r.number))].sort((a,b)=>a-b)},
 {id:'endorsements' as const,label:'Endorsements',done:findings.length>0&&findings.every(f=>findingPhase(round,f)==='Closed')}];
}
export function initialReviewerComplete(round:ReviewRound,email:string){const p=round.document.participants.find(p=>p.email===email);return !!p&&p.state!=='declined'&&round.document.units.every(u=>p.coverage.includes(u.slug)&&activeFindings(round.document).some(f=>f.author===email&&findingAppliesToUnit(f,u.slug)));}
export function reviewerContentComplete(round:ReviewRound,email:string){
 const d=round.document,p=d.participants.find(p=>p.email===email);if(!p||p.state==='declined'||!p.userId)return false;
 const all=activeFindings(d),own=all.filter(f=>f.author===email);
 if(p.role==='peer')return all.some(f=>currentEndorsements(round,f).some(e=>e.userId===p.userId));
 return d.units.every(u=>p.coverage.includes(u.slug)&&own.some(f=>findingAppliesToUnit(f,u.slug)))&&own.every(f=>findingPhase(round,f)==='Closed');
}
export function luWorkflowBlockers(round:ReviewRound){
 const d=round.document,issues:string[]=[];
 for(const p of d.participants.filter(p=>p.role==='primary'&&p.state!=='declined'&&hasReviewTask(p,'content'))){const missing=d.units.filter(u=>!p.coverage.includes(u.slug));if(missing.length)issues.push(`${p.email}: ${missing.length} LU review confirmations outstanding.`);const absent=d.units.filter(u=>!activeFindings(d).some(f=>f.author===p.email&&findingAppliesToUnit(f,u.slug)));if(absent.length)issues.push(`${p.email}: ${absent.length} LUs need a finding or nothing-to-add declaration.`);}
 const pending=activeFindings(d).filter(f=>findingPhase(round,f)!=='Closed');if(pending.length)issues.push(`${pending.length} findings or review declarations still need a response, acceptance or one additional endorsement.`);
 return issues;
}
