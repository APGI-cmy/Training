import {activeFindings,findingAppliesToUnit,type ReviewRound} from '@/lib/course-review';
import {canEndorseFinding,cleanReviewMessage,findingPhase,luCleanReviewComplete,luInitialReviewProgress} from '@/lib/lu-review-workflow';

export function CleanReviewStatus({course=false}:{course?:boolean}){return <section className="form-success" role="status" aria-label="No findings review complete"><strong>{cleanReviewMessage}</strong><p>{course?'Course content review complete — ready for final publication checks.':'All four LU review stages are complete. This LU is ready for the course’s final publication checks.'}</p><p>Final course clearance, commercial and branding approvals remain separate.</p></section>;}

export function LUEndorsementStatus({round,unit}:{round:ReviewRound;unit:string}){
 if(luCleanReviewComplete(round,unit))return <p>No endorsements are required for this LU: every assigned full reviewer completed the initial review without raising a finding.</p>;
 const findings=activeFindings(round.document).filter(f=>findingAppliesToUnit(f,unit)),pending=findings.filter(f=>findingPhase(round,f)!=='Closed');
 return <section className="lu-endorsement-status" aria-label="Team endorsement status"><p><strong>{findings.length-pending.length} of {findings.length} records closed.</strong></p>{pending.length?<><p>Still outstanding for this LU:</p><ul>{pending.map(f=>{const phase=findingPhase(round,f),eligible=round.document.participants.filter(p=>canEndorseFinding(round,f,p.email,p.userId??p.email));return <li key={f.id}><a href={`#finding-${f.id}`}>{f.reference} · {f.author}</a>: {phase==='Awaiting endorsement'?`awaiting one endorsement${eligible.length?` from ${eligible.map(p=>p.email).join(', ')}`:'. No other eligible reviewer is currently assigned'}.`:phase==='Awaiting team review'?'waiting for the team’s initial reviews; unanimous no-findings reviews skip endorsements.':phase==='Reopened'?'reopened — the next correction or revised review must be submitted before endorsement.':'designer implementation response required before endorsement.'}</li>;})}</ul></>:null}</section>;
}

export function InitialReviewStatus({round,unit,email,recheckPending=false}:{round:ReviewRound;unit:string;email:string;recheckPending?:boolean}){
 const progress=luInitialReviewProgress(round,unit,recheckPending),own=progress.find(p=>p.email===email),pending=progress.filter(p=>!p.complete);
 const requirements=(p:typeof progress[number])=>[!p.coverage?recheckPending?'recheck the updated LU and confirm coverage after registration':'confirm LU coverage':null,!p.recorded?'save a finding or a nothing-to-add declaration':null].filter(Boolean).join('; ');
 return <section className="lu-initial-status" aria-label="Personal and team initial review status">
  {recheckPending?<p className="lu-pending"><strong>The updated LU needs a new review confirmation.</strong> Earlier coverage confirmations remain saved as history. The platform registers the corrected package automatically; each assigned reviewer must then check this LU again and confirm coverage.</p>:null}
  {own?<p className={own.complete?'form-success':'lu-pending'}><strong>Your initial review: {own.deemed?'Deemed endorsement — no response':own.complete?'Complete':'Not complete'}</strong>{own.deemed?' The seven-day rule fulfilled this workflow requirement; no actual coverage confirmation was recorded.':!own.complete?` — ${requirements(own)}.`:null}</p>:null}
  <p><strong>Team initial review: {progress.filter(p=>p.complete).length} of {progress.length} reviewers complete.</strong></p>
  {progress.some(p=>p.deemed)?<p>{progress.filter(p=>p.deemed).length} completed by deemed endorsement. Actual review confirmations are shown separately.</p>:null}
  {pending.length?<><p>Still required from the team:</p><ul>{pending.map(p=><li key={p.email}><strong>{p.email}</strong>: {requirements(p)}.</li>)}</ul></>:null}
  {progress.length<2?<p>At least two assigned full content reviewers are required.</p>:null}
 </section>;
}

export function PendingEndorsement({declaration=false}:{declaration?:boolean}){
 return <p className="lu-pending">{declaration?'Your review declaration is saved.':'Your implementation response is complete.'} Awaiting endorsement from one other reviewer.</p>;
}
