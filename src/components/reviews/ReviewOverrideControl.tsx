import type {ReviewRound} from '@/lib/course-review';
import {reviewOverride,type ReviewScope} from '@/lib/review-overrides';
import {ReviewForm} from './ReviewForms';

export function ReviewOverrideControl({round,scope,principal,brandRevision}:{round:ReviewRound;scope:ReviewScope;principal:boolean;brandRevision:number}){
 const override=reviewOverride(round.document,scope,round.fingerprint,brandRevision);
 const title=scope==='content'?'Content':scope==='commercials'?'Commercial':'Branding';
 const sourceId=round.document.sourceReviewId??round.id;
 const editable=principal&&round.status==='open';
 return <section className="review-box" id={`review-override-${scope}`} data-review-override={scope}>
  <h3>{title} review override</h3>
  {override?<>
   <p className="form-success">{override.mode==='clear'?'Override and discard review — active review steps are green.':'Override but retain review process — publication is permitted; outstanding review steps remain visible.'}</p>
   <p>{override.email} · {override.at} · {override.reason}</p>
   <p><a href={`/course-reviews/${sourceId}/overrides/${override.id}`}>View the preserved review history and override reason</a></p>
   <a className="primary-button" href={`/course-reviews/${sourceId}#final-publication`}>Continue to publish</a>
  </>:<p>Choose whether to close this review or keep it running while training is published. Other review workflows need their own approval or override.</p>}
  {editable?<>
   <p>An override applies to this saved version only. It does not publish automatically, pass learner assessments, change course prices or enable payments.</p>
   <ReviewForm id={round.id} operation="review_override" hidden={{scope,expected_revision:String(round.revision),expected_fingerprint:round.fingerprint,brand_revision:String(brandRevision)}} label="Save review override">
    <label>Override option<select name="mode" defaultValue="retain">
     <option value="clear">1. Override and discard review</option>
     <option value="retain">2. Override but retain review process</option>
    </select></label>
    <p>Option 1 closes the active review steps and archives the earlier evidence. Option 2 keeps findings, responses and endorsements open; they can still be completed after publication. Neither option deletes the audit history.</p>
    <label>Reason for the override<textarea name="reason" minLength={15} maxLength={4000} required/></label>
    <label><input type="checkbox" name="confirm_override" required/> Are you sure you want to override the current review process? I confirm the selected option and reason.</label>
   </ReviewForm>
  </>:null}
  {editable&&override?<details><summary>Reactivate normal review gates</summary>
   <ReviewForm id={round.id} operation="review_override" hidden={{scope,mode:'revoke',override_id:override.id,expected_revision:String(round.revision),expected_fingerprint:round.fingerprint,brand_revision:String(brandRevision)}} label="Remove override and reactivate review">
    <p>The preserved review evidence will govern future publication again. A release already published remains frozen for its learners.</p>
    <label>Reason for reactivating review<textarea name="reason" minLength={15} maxLength={4000} required/></label>
    <label><input type="checkbox" name="confirm_override" required/> I confirm removal of this override and restoration of normal review gates.</label>
   </ReviewForm>
  </details>:null}
 </section>;
}
