import type {ReviewPerson,ReviewRound} from '@/lib/course-review';
import type {courseReviewProgress} from '@/lib/review-progress';
import {canEndorseFinding} from '@/lib/lu-review-workflow';
import {outstandingAssignedTasks,reviewTaskLabels} from '@/lib/review-tasks';

type Progress=ReturnType<typeof courseReviewProgress>;
type PersonProgress=Progress['reviewers'][number];
function Units({units,base}:{units:PersonProgress['missingCoverage'];base:string}){
 return <ul>{units.map(u=><li key={u.slug}><a href={`${base}#review-unit-${u.slug}`}>{u.slug.toUpperCase()} · {u.title}</a></li>)}</ul>;
}
export function ReviewerInitialDetails({progress:p,base}:{progress:PersonProgress;base:string}){
 return <>
  <p><strong>Current coverage: {p.confirmed}/{p.total} LUs confirmed.</strong> Saved feedback: {p.recorded}/{p.total} LUs have a finding or “nothing to add” declaration.</p>
  {p.earlierReport?<p>Earlier full review saved: {new Date(p.earlierReport.at).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST. Missing current confirmations or individual feedback records do not erase this report.</p>:null}
  {p.rechecks.length?<><p><strong>Rechecks after updates: {p.rechecks.length}.</strong> Open these LUs, check the current content and confirm coverage again.</p><Units units={p.rechecks} base={base}/></>:null}
  {p.firstReviews.length?<><p><strong>Coverage confirmation required: {p.firstReviews.length} LUs.</strong></p><Units units={p.firstReviews} base={base}/></>:null}
  {!p.missingCoverage.length?<p>No outstanding personal coverage confirmations{p.deemed?' beyond the separately recorded seven-day workflow outcomes':''}.</p>:null}
  {p.deemed?<p>{p.deemed} LU requirements fulfilled by the seven-day rule. These are deemed outcomes, not actual reviewer coverage confirmations.</p>:null}
  {p.missingRecords.length?<><p><strong>Current feedback record missing: {p.missingRecords.length} LUs.</strong> The current initial-review rule also requires a saved finding or “nothing to add” declaration.{p.earlierReport?' Compare the earlier saved report before repeating work; an earlier report is not automatically converted into new unit declarations.':''}</p><Units units={p.missingRecords} base={base}/></>:null}
 </>;
}
export function ReviewTeamProgress({round,person,progress,brandRevision}:{round:ReviewRound;person:ReviewPerson;progress:Progress;brandRevision:number}){
 const p=progress.reviewers.find(r=>r.email===person.email),base=`/course-reviews/${round.id}`;
 const pending=outstandingAssignedTasks(round,person,brandRevision).filter(t=>t!=='content');
 const available=person.state==='declined'?[]:progress.awaitingEndorsement.filter(r=>canEndorseFinding(round,r.finding,person.email,person.userId??person.email));
 const own=progress.awaitingEndorsement.filter(r=>r.finding.author===person.email);
 if(person.state==='declined')return <p>Declined{person.reason?` — ${person.reason}`:''}. Earlier records remain saved.</p>;
 return <div className="review-team-progress">
  <p title="Saved confirmation that this reviewer checked the learning unit and quizzes. Endorsement and publication are separate.">{p?<><strong>LU coverage: {p.confirmed}/{p.total} confirmed</strong>{p.rechecks.length?<span>{p.rechecks.length} rechecks after updates</span>:p.firstReviews.length?<span>{p.firstReviews.length} coverage confirmations outstanding</span>:p.deemed?<span>{p.deemed} separately recorded deemed outcomes</span>:<span>Personal coverage complete</span>}</>:<strong>Peer checks / assigned approvals</strong>}</p>
  <details><summary>See progress and required actions</summary>
   {p?<ReviewerInitialDetails progress={p} base={base}/>:null}
   <p><strong>Endorsements this reviewer can provide: {available.length}.</strong> {available.length?'Open a listed record and choose Yes or No with a reason.':'No submitted record is currently awaiting this reviewer’s eligible endorsement.'}</p>
   {available.length?<ul>{available.map(r=><li key={r.finding.id}><a href={`${base}#finding-${r.finding.id}`}>{r.finding.unit.toUpperCase()} · {r.finding.reference}</a></li>)}</ul>:null}
   {own.length?<p>{own.length} of this reviewer’s own records await an eligible reviewer’s endorsement. This does not mean their coverage confirmations or implementation responses are missing.</p>:null}
   {pending.length?<p>Separate approvals still required: {pending.map(t=>reviewTaskLabels[t]).join(', ')}.</p>:null}
   <p>Final publication is performed separately after the review and approval requirements are complete.</p>
  </details>
 </div>;
}
