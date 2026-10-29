import {activeFindings,findingAppliesToUnit,type ReviewRound} from '@/lib/course-review';
import {canEndorseFinding,findingPhase,luInitialReviewProgress} from '@/lib/lu-review-workflow';

export function LUEndorsementStatus({round,unit}:{round:ReviewRound;unit:string}){
 const findings=activeFindings(round.document).filter(f=>findingAppliesToUnit(f,unit)),pending=findings.filter(f=>findingPhase(round,f)!=='Closed');
 return <section className="lu-endorsement-status" aria-label="Team endorsement status"><p><strong>{findings.length-pending.length} of {findings.length} records closed with independent endorsement.</strong></p>{pending.length?<><p>Still outstanding for this LU:</p><ul>{pending.map(f=>{const phase=findingPhase(round,f),eligible=round.document.participants.filter(p=>canEndorseFinding(round,f,p.email,p.userId??p.email));return <li key={f.id}><a href={`#finding-${f.id}`}>{f.reference} · {f.author}</a>: {phase==='Awaiting endorsement'?`awaiting one endorsement${eligible.length?` from ${eligible.map(p=>p.email).join(', ')}`:'. No other eligible reviewer is currently assigned'}.`:phase==='Reopened'?'reopened — the next correction or revised review must be submitted before endorsement.':'designer implementation response required before endorsement.'}</li>;})}</ul></>:null}</section>;
}

export function InitialReviewStatus({round,unit,email,recheckPending=false}:{round:ReviewRound;unit:string;email:string;recheckPending?:boolean}){
 const progress=luInitialReviewProgress(round,unit,recheckPending),own=progress.find(p=>p.email===email),pending=progress.filter(p=>!p.complete);
 const requirements=(p:typeof progress[number])=>[!p.coverage?recheckPending?'recheck the updated LU and confirm coverage after registration':'confirm LU coverage':null,!p.recorded?'save a finding or a nothing-to-add declaration':null].filter(Boolean).join('; ');
 return <section className="lu-initial-status" aria-label="Personal and team initial review status">
  {recheckPending?<p className="lu-pending"><strong>The updated LU needs a new review confirmation.</strong> Earlier coverage confirmations remain saved as history. Register the corrected package in Changes implemented, then each assigned reviewer must check this LU again and confirm coverage.</p>:null}
  {own?<p className={own.complete?'form-success':'lu-pending'}><strong>Your initial review: {own.complete?'Complete':'Not complete'}</strong>{!own.complete?` — ${requirements(own)}.`:null}</p>:null}
  <p><strong>Team initial review: {progress.filter(p=>p.complete).length} of {progress.length} reviewers complete.</strong></p>
  {pending.length?<><p>Still required from the team:</p><ul>{pending.map(p=><li key={p.email}><strong>{p.email}</strong>: {requirements(p)}.</li>)}</ul></>:null}
  {progress.length<2?<p>At least two assigned full content reviewers are required.</p>:null}
 </section>;
}

export function PendingEndorsement({declaration=false}:{declaration?:boolean}){
 return <p className="lu-pending">{declaration?'Your review declaration is saved.':'Your implementation response is complete.'} Awaiting endorsement from one other reviewer.</p>;
}
