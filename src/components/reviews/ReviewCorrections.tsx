import {deemedEndorsementsForFinding} from '@/lib/review-nonresponse';
import {SummaryText} from "@/components/shared/SummaryText";
import {findingLocationLabel,activeFindings,canWork,type ReviewRound} from "@/lib/course-review";
import {ReviewForm} from "./ReviewForms";
import {WorkflowSectionHeading} from "./WorkflowSectionStatus";
import type {WorkflowStep} from "@/lib/publication-guide";
import {correctionRecheckUnits} from "@/lib/course-correction-scope";

export function ReviewCorrections({round,hash,principal,step}:{round:ReviewRound;hash:string;principal:boolean;step?:WorkflowStep}) {
 const d=round.document,changed=hash!==round.fingerprint,revisions=d.contentRevisions??[];
 const issues=activeFindings(d).filter(f=>f.outcome!=="satisfied"&&f.blocking);
 const recheck=changed?correctionRecheckUnits(round,hash):revisions.at(-1)?.changedUnits??d.units.map(u=>u.slug);
 return <section className="review-box" id="changes-implemented" aria-label="Course corrections"><WorkflowSectionHeading title="Changes implemented" step={step}/>
 {principal&&d.reviewProcessVersion===3&&round.status==='open'&&!d.nonresponsePolicy?<ReviewForm id={round.id} operation="enable_nonresponse_policy" label="Enable seven-day rule and notify reviewers"><p>Enable deemed content endorsements after seven days without a response. Existing reviewers receive fresh notices; earlier invitations are not counted retroactively. Commercial and branding approvals remain explicit.</p></ReviewForm>:null}
 <ol><li>Apply the corrections in iSpring, export the course package, update GitHub and deploy to V2.</li><li>The platform verifies and registers the live deployment automatically, identifies the changed LUs and notifies their review team.</li><li>Under each affected finding, describe the correction and mark it implemented. A different reviewer checks the deployed correction and verifies it.</li><li>{d.reviewProcessVersion===3?"Reviewers recheck the changed LUs and their quizzes. Submitted implementation responses go directly to Endorsements: Yes closes the record; No with a reason reopens it. Unanimous first reviews with no findings skip endorsements. Coverage for unchanged units stays saved. The requester then clears final content before publication.":"Reviewers recheck the changed LUs and their quizzes, submit updated reports and obtain independent endorsements. Coverage for verified unchanged units stays saved. The requester then clears final content before publication."}</li></ol>
 {recheck.length<d.units.length?<p className="form-success"><strong>Recheck only: {recheck.map(u=>u.toUpperCase()).join(" and ")}.</strong> Coverage for the other {d.units.length-recheck.length} learning units is retained. Earlier findings, screenshots, reports and endorsements stay saved.</p>:null}
 <p>Earlier reports, comments and screenshots remain in the audit trail. Unchanged commercial sign-offs and the negotiation limit are retained. Previous company acceptance of changed content must be reconfirmed.</p>
 {round.status!=="open"?<p>This review is closed. Its correction history is retained.</p>:changed?<>
  <p className="form-error" role="status">The updated course is awaiting automatic live-deployment verification. Saved records remain readable. Saving resumes after registration.</p>
  <ReviewForm id={round.id} operation="retry_deployment_registration" label="Check latest deployment"><p>No commit reference or technical release form is required. The platform records the live version and preserves unchanged LU coverage.</p></ReviewForm>
  <details><summary>Deployment status details</summary><p>Reviewed version: {round.fingerprint.slice(0,12)} · Detected version: {hash.slice(0,12)}</p></details>
 </>:<p>The current course version is registered. You can continue the review and record implementation notes. A future live content update will be registered automatically.</p>}

 {issues.length?<><h3>Blocking corrections</h3><ul>{issues.map(f=><li key={f.id}><a href={`/course-reviews/${round.id}#finding-${f.id}`}>{findingLocationLabel(f)} · {f.reference}</a> — {deemedEndorsementsForFinding(round,f).length?'Deemed endorsement — no response (seven-day rule)':f.status==="closed"&&f.verifiedFingerprint===hash?"Independently verified for this version":f.status==="fixed"&&f.fixedFingerprint===hash?"Implemented — independent verification required":f.status==="closed"&&!revisions.length?"Closed in the reviewed version":"Implementation and verification required"}</li>)}</ul></>:<p>No publication-blocking findings recorded.</p>}
 {!canWork(round)&&round.status==="open"&&!changed?<p>Request a cutoff extension under Manage the request before submitting further corrections.</p>:null}
 {revisions.length?<details><summary>Registered correction releases ({revisions.length})</summary>{revisions.slice().reverse().map((r,index)=><article key={`${r.fingerprint}-${index}`}><h3>Version {r.fingerprint.slice(0,12)}</h3><p>{r.automatic?'Registered automatically by the APGI platform':r.email} · {r.at}</p><SummaryText text={r.notes}/><details><summary>Deployment reference</summary><p>{r.deployment}</p></details></article>)}</details>:null}
 </section>;
}
