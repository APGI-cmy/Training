import {canWork,type ReviewFinding,type ReviewRound} from '@/lib/course-review';
import {canImplement} from '@/lib/lu-review-workflow';
import {ImplementationEditor} from './LUReviewForms';

export function LUImplementationAction({round,finding,email,userId,fresh,needed,onRegister}:{round:ReviewRound;finding:ReviewFinding;email:string;userId:string;fresh:boolean;needed:boolean;onRegister:()=>void}) {
 if(!needed||!canImplement(round,finding,email,userId))return null;
 if(!fresh)return <div className="form-error" role="status" aria-label="Implementation response paused">
  <p><strong>The live course update is awaiting automatic registration.</strong></p>
  <p>Your finding is still saved. Registration runs automatically after the live deployment is verified. Refresh this page to retry. You will then record the implementation response separately.</p>
  <a className="secondary-button" href={`/course-reviews/${round.id}#changes-implemented`} onClick={onRegister}>Check deployment status</a>
 </div>;
 if(!canWork(round))return <p className="form-error" role="status">The implementation form is paused because this review is closed or overdue. Your finding is still saved. Ask the requester to reopen or extend the review before submitting the response.</p>;
 return <ImplementationEditor round={round} finding={finding} userId={userId}/>;
}
