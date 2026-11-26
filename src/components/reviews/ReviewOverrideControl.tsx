import type {ReviewRound} from '@/lib/course-review';
import {reviewOverride,type ReviewScope} from '@/lib/review-overrides';
import {ReviewForm} from './ReviewForms';
import {publishedTrainingRelease,publishedReviewOverride,type TrainingRelease} from '@/lib/review-publication-state';

export function ReviewOverrideControl({round,scope,principal,brandRevision,activeRelease}:{round:ReviewRound;scope:ReviewScope;principal:boolean;brandRevision:number;activeRelease?:TrainingRelease|null}){
 const override=reviewOverride(round.document,scope,round.fingerprint,brandRevision);
 const title=scope==='content'?'Content':scope==='commercials'?'Commercial':'Branding';
 const sourceId=round.document.sourceReviewId??round.id;
 const editable=principal&&round.status==='open';
 const release=activeRelease===undefined?publishedTrainingRelease(round,round.fingerprint,brandRevision):activeRelease;
 const publishedOverride=release?publishedReviewOverride(round,scope,release):undefined;
 const canSaveNew=!release||publishedTrainingRelease(round,round.fingerprint,brandRevision)?.id!==release.id;
 const reviewTarget=scope==='content'?(round.document.reviewProcessVersion===3?'review-process':'content-review'):scope==='commercials'?'commercial-preparation':'branding-review';
 const management=<>
   {canSaveNew?<><p>An override applies to this saved version only. It does not publish automatically, pass learner assessments, change course prices or enable payments.</p>
   <ReviewForm id={round.id} operation="review_override" hidden={{scope,expected_revision:String(round.revision),expected_fingerprint:round.fingerprint,brand_revision:String(brandRevision)}} label={release?"Save override for the next release":"Save review override"}>
    <label>Override option<select name="mode" defaultValue="retain">
     <option value="clear">1. Override and discard review</option>
     <option value="retain">2. Override but retain review process</option>
    </select></label>
    <p>Option 1 closes the active review steps and archives the earlier evidence. Option 2 keeps findings, responses and endorsements open; they can still be completed after publication. Neither option deletes the audit history.</p>
    <label>Reason for the override<textarea name="reason" minLength={15} maxLength={4000} required/></label>
    <label><input type="checkbox" name="confirm_override" required/> Are you sure you want to override the current review process? I confirm the selected option and reason.</label>
   </ReviewForm></>:null}
   {override?<details><summary>Reactivate normal review gates</summary>
    <ReviewForm id={round.id} operation="review_override" hidden={{scope,mode:'revoke',override_id:override.id,expected_revision:String(round.revision),expected_fingerprint:round.fingerprint,brand_revision:String(brandRevision)}} label="Remove override and reactivate review">
     <p>The preserved review evidence will govern future publication again. A release already published remains frozen for its learners.</p>
     <label>Reason for reactivating review<textarea name="reason" minLength={15} maxLength={4000} required/></label>
     <label><input type="checkbox" name="confirm_override" required/> I confirm removal of this override and restoration of normal review gates.</label>
    </ReviewForm>
   </details>:null}
 </>;
 return <section className="review-box" id={`review-override-${scope}`} data-review-override={scope}>
  <h3>{title} review — {publishedOverride?.mode==='retain'?'published under override, review continuing':publishedOverride?.mode==='clear'?'published under override, review closed':release?'published':'override'}</h3>
  {release?<>
   <p className="form-success">This course was published on {new Date(release.at).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST.</p>
   {publishedOverride?<><p><strong>Publication reason:</strong> {publishedOverride.reason}</p><p>Recorded by {publishedOverride.email}.</p></>:null}
   <p>{publishedOverride?.mode==='retain'?'The review process was retained. Please complete your review steps below.':publishedOverride?.mode==='clear'?'This review was closed by the recorded override. Earlier review evidence remains in history.':'This release is published. The saved review decisions remain available below.'}</p>
   {publishedOverride?<p><a href={`/course-reviews/${sourceId}/overrides/${publishedOverride.id}`}>View the preserved review history and publication reason</a></p>:null}
   {publishedOverride?.mode!=='clear'?<a className="primary-button" href={`/course-reviews/${sourceId}#${reviewTarget}`}>Go to review steps</a>:null}
  </>:override?<>
   <p className="form-success">{override.mode==='clear'?'Override and discard review — active review steps are green.':'Override but retain review process — publication is permitted; outstanding review steps remain visible.'}</p>
   <p>{override.email} · {override.at} · {override.reason}</p>
   <p><a href={`/course-reviews/${sourceId}/overrides/${override.id}`}>View the preserved review history and override reason</a></p>
   <a className="primary-button" href={`/course-reviews/${sourceId}#final-publication`}>Continue to publish</a>
  </>:<p>Choose whether to close this review or keep it running while training is published. Other review workflows need their own approval or override.</p>}
  {editable?(release?(canSaveNew||override?<details data-override-management><summary>Manage override settings for future publication</summary>{management}</details>:null):management):null}
 </section>;
}
