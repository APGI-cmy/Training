import {courseReviewProgress} from '@/lib/review-progress';
import type {ReviewRound} from '@/lib/course-review';
import {ReviewerInitialDetails} from './ReviewTeamProgress';

export function ReviewProgressSummary({round}:{round:ReviewRound}){
 const p=courseReviewProgress(round),base=`/course-reviews/${round.id}`;
 return <section id="review-progress-summary" className="review-progress-summary" aria-label="Live LU review progress">
  <h3>Review progress at a glance</h3>
  <dl className="review-progress-metrics">
   <div><dt title="One confirmation per full reviewer per learning unit. This counts saved coverage, not endorsements or publication.">LU coverage confirmations</dt><dd>{p.coverageRequired?`${p.coverageConfirmed}/${p.coverageRequired}`:'Not assigned'}</dd><p>{p.reviewers.length} reviewers × {p.units.length} LUs{p.rechecks?` · ${p.rechecks} rechecks pending`:''}</p></div>
   <div><dt title="Designer implementation responses submitted for findings. A submitted response can still need an endorsement or a further response after reopening.">Implementation responses</dt><dd>{p.corrections.length?`${p.submitted}/${p.corrections.length}`:'None required'}</dd><p>{!p.corrections.length?'No change findings currently require a response':p.implementationComplete?'All required responses submitted':`${p.pendingCorrections.length} open or reopened records need attention`}</p></div>
   <div><dt title="Submitted findings and review declarations waiting for one eligible reviewer's endorsement. This does not make completed implementation work incomplete.">Awaiting endorsement</dt><dd>{p.awaitingEndorsement.length}</dd><p>Review records awaiting a decision</p></div>
   <div><dt title="Closed review records, including completed checks and applicable no-findings or seven-day workflow rules. This is not a count of published LUs.">Review records closed</dt><dd>{p.records.length?`${p.closed.length}/${p.records.length}`:'No records yet'}</dd><p>Final publication is a separate step</p></div>
  </dl>
  <details className="review-progress-explanation">
   <summary>What do these figures mean, and who needs to act?</summary>
   <p>Coverage means the reviewer confirmed that they checked the LU and its quizzes. With {p.reviewers.length} full reviewers and {p.units.length} LUs, there are {p.coverageRequired} possible reviewer–LU confirmations. A recheck is a missing current confirmation for a unit included in that reviewer’s earlier saved report.</p>
   <p><strong>Team initial review requirements: {p.initialComplete}/{p.units.length} LUs meet both checks for every full reviewer.</strong> The current workflow requires coverage <em>and</em> a saved finding or “nothing to add” declaration. This separate figure does not mean that only {p.initialComplete} LUs have ever been reviewed.</p>
   {p.reviewers.map(r=><section key={r.email} className="review-progress-person"><h4>{r.email}</h4><ReviewerInitialDetails progress={r} base={base}/></section>)}
   {p.awaitingInitial.length?<p>{p.awaitingInitial.length} no-change declarations are waiting for the team’s initial reviews. Unanimous completed no-findings reviews do not require endorsements.</p>:null}
   {p.awaitingEndorsement.length?<details><summary>Records awaiting endorsement ({p.awaitingEndorsement.length})</summary><ul>{p.awaitingEndorsement.map(r=><li key={r.finding.id}><a href={`${base}#finding-${r.finding.id}`}>{r.finding.unit.toUpperCase()} · {r.finding.reference}</a> · {r.finding.author}</li>)}</ul></details>:null}
   <p>Submitting an implementation response completes that response step. Endorsements, commercial approvals, branding approval and final publication remain separate. Earlier reports and decisions stay saved; these summaries do not add approvals or reset review records.</p>
  </details>
 </section>;
}
