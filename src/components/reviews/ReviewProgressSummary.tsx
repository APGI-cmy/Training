import {courseReviewProgress} from '@/lib/review-progress';
import type {ReviewRound} from '@/lib/course-review';
export function ReviewProgressSummary({round}:{round:ReviewRound}){
 const p=courseReviewProgress(round),base=`/course-reviews/${round.id}`;
 return <section aria-label="Live LU review progress"><h3>Current LU progress</h3><ul className="summary-totals">
  <li>{p.initialComplete}/{p.units.length} LUs: team initial review complete</li>
  <li>{p.submitted}/{p.corrections.length} implementation responses submitted</li>
  <li>{p.awaitingEndorsement.length} records awaiting endorsement</li>
  <li>{p.closed.length}/{p.records.length} review records closed</li>
 </ul>{p.awaitingInitial.length?<p>{p.awaitingInitial.length} no-change declarations are waiting for the team’s initial reviews.</p>:null}
 {p.reviewers.some(r=>r.missingCoverage.length||r.missingRecords.length)?<details><summary>Outstanding initial review confirmations and feedback</summary>{p.reviewers.filter(r=>r.missingCoverage.length||r.missingRecords.length).map(r=><section key={r.email}><h4>{r.email}</h4>
  {r.missingCoverage.length?<p>Coverage confirmation required: {r.missingCoverage.map((u,i)=><span key={u.slug}>{i?', ':''}<a href={`${base}#review-unit-${u.slug}`}>{u.slug.toUpperCase()} · {u.title}</a></span>)}.</p>:null}
  {r.missingRecords.length?<p>Saved finding or nothing-to-add declaration required: {r.missingRecords.map((u,i)=><span key={u.slug}>{i?', ':''}<a href={`${base}#review-unit-${u.slug}`}>{u.slug.toUpperCase()} · {u.title}</a></span>)}.</p>:null}
 </section>)}</details>:null}</section>;
}
