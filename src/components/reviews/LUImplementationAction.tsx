import {canWork,type ReviewFinding,type ReviewRound} from '@/lib/course-review';
import {canImplement} from '@/lib/lu-review-workflow';
import {ImplementationEditor} from './LUReviewForms';

export function LUImplementationAction({round,finding,email,userId,fresh,needed,onRegister}:{round:ReviewRound;finding:ReviewFinding;email:string;userId:string;fresh:boolean;needed:boolean;onRegister:()=>void}) {
 if(!needed||!canImplement(round,finding,email,userId))return null;
 if(!fresh)return <div className="form-error" role="status" aria-label="Implementation response paused">
  <p><strong>The implementation form is paused because the new course package has not been registered.</strong></p>
  <p>Your finding is still saved. Register the deployed correction in Changes implemented, then return here to record and submit the implementation response. Uploading the corrected package does not submit that response.</p>
  <a className="secondary-button" href={`/course-reviews/${round.id}#changes-implemented`} onClick={onRegister}>Open Changes implemented</a>
 </div>;
 if(!canWork(round))return <p className="form-error" role="status">The implementation form is paused because this review is closed or overdue. Your finding is still saved. Ask the requester to reopen or extend the review before submitting the response.</p>;
 return <ImplementationEditor round={round} finding={finding} userId={userId}/>;
}
