import type {ReviewRound} from '@/lib/course-review';
import type {WorkflowStep} from '@/lib/publication-guide';
import {courseReviewProgress} from '@/lib/review-progress';
import {currentImplementation} from '@/lib/lu-review-workflow';
import {ReviewForm} from './ReviewForms';
import {WorkflowSectionHeading} from './WorkflowSectionStatus';
import {ReviewEndorsementTracking,type EndorsementTracking} from './ReviewEndorsementTracking';
export function CurrentReviewCorrections({round,hash,principal,step,tracking}:{round:ReviewRound;hash:string;principal:boolean;step?:WorkflowStep;tracking?:EndorsementTracking}){
 const p=courseReviewProgress(round),fresh=hash===round.fingerprint,base=`/course-reviews/${round.id}`,revisions=round.document.contentRevisions??[];
 return <section className="review-box" id="changes-implemented" aria-label="Course corrections"><h2>Correction releases and response deadlines</h2>
 {round.status!=='open'?<p>This review is closed. Its implementation and endorsement history remains saved.</p>:!fresh?<><p className="form-error" role="status">The updated live course is awaiting automatic registration. Saved findings and review work remain available.</p><ReviewForm id={round.id} operation="retry_deployment_registration" label="Check latest deployment"/></>:<p>The current course version is registered. Future live updates register automatically; no manual deployment form is required.</p>}
 <p><a href="#review-guidance">Open the guidance box for findings, corrections and outstanding endorsements.</a></p>
 <ReviewEndorsementTracking round={round} tracking={tracking}/>
 {principal&&round.status==='open'&&!round.document.nonresponsePolicy?<ReviewForm id={round.id} operation="enable_nonresponse_policy" label="Enable seven-day rule and notify reviewers"><p>Existing reviewers receive fresh notices. Earlier invitations do not count retroactively.</p></ReviewForm>:null}
 <details><summary>How corrections and endorsements work</summary><ol><li>Publish the corrected package and deploy it to V2. Registration is automatic.</li><li>Submit implementation notes for each finding. This completes Implementation feedback.</li><li>An eligible reviewer selects Yes under Endorsements to close the record, or No with a reason to reopen it. No separate acceptance decision is required.</li><li>Only changed LUs need new coverage confirmation. Saved findings, responses and earlier review records are retained.</li></ol></details>
 {revisions.length?<details><summary>Registered correction releases ({revisions.length})</summary>{revisions.slice().reverse().map((r,i)=><article key={`${r.fingerprint}-${i}`}><h3>Version {r.fingerprint.slice(0,12)}</h3><p>{r.automatic?'Registered automatically by the APGI platform':r.email} · {r.at}</p><p>Changed LUs: {r.changedUnits?.map(u=>u.toUpperCase()).join(', ')??'Whole course'}. Unchanged LU coverage is retained.</p></article>)}</details>:null}
 </section>;
}
