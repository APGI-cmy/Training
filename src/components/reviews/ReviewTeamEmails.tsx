import {ReviewForm} from './ReviewForms';
import {ReviewInvitationSummary} from './ReviewInvitationSummary';
import {canWork,type ReviewRound} from '@/lib/course-review';
import type {ReviewInvitationEmailState} from '@/lib/review-invitation-email';

export function ReviewTeamEmails({round,fresh,invitationEmail}:{round:ReviewRound;fresh:boolean;invitationEmail:ReviewInvitationEmailState}){
 const pending=round.document.participants.filter(person=>person.state!=='finished'&&person.state!=='declined');
 const locked=!fresh||!canWork(round)||!pending.length||invitationEmail.status==='blocked';
 return <div aria-label="Resend review emails"><ReviewInvitationSummary state={invitationEmail}/>
 <p>Resend the current invitation to all {pending.length} reviewers with outstanding work. Each person receives a separate email with their own assignments and joining link. Completed and declined reviewers are excluded. Existing reviews and approvals are retained.</p>
 {!fresh||!canWork(round)?<p>Resending is unavailable until the review is open, within its cutoff and matches the deployed course.</p>:null}
 <ReviewForm id={round.id} operation="resend_all_invites" disabled={locked} label={`Resend review emails to all ${pending.length} pending reviewers`}/>
 <details><summary>Resend to one reviewer</summary>{pending.map(person=><ReviewForm key={person.email} id={round.id} operation="resend_invite" hidden={{recipient:person.email}} disabled={locked} label={`Resend review email to ${person.email}`}/>)}</details>
 <p><a href="#manage-request">View email delivery status</a>. “Accepted by email provider” confirms sending was accepted, rather than inbox delivery or reading.</p>
 </div>;
}
