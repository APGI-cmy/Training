import 'server-only';
import type {ReviewRound} from '@/lib/course-review';
import {assignedTasks,reviewTaskLabels} from '@/lib/review-tasks';
import {messageRpc} from '@/server/services/messages';
import {renderEmailSet,type EmailSnapshot} from '@/server/services/email-set-renderer';
import {renderReviewMessage} from './review-message';
import type {EmailDesign} from '@/lib/email-sets';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
export type InvitationSnapshot={mode:'native';subject:string;body:string}|{mode:'configured';subject:string;email:EmailSnapshot};
export type ReviewInvitationMail={id:string;recipient:string;subject:string;body:string;kind:string;email_snapshot?:InvitationSnapshot|null};
export async function renderConfiguredInvitation(round:ReviewRound,mail:ReviewInvitationMail){
 let snapshot=mail.email_snapshot;
 if(!snapshot){
  const design=await messageRpc<EmailDesign|null>('v2_email_review_design',{p_org:round.organisation_id,p_course:round.course_id});
  if(design){
   const person=round.document.participants.find(p=>p.email===mail.recipient)!;
   const scope=assignedTasks(person).map(task=>reviewTaskLabels[task]).join(', ')||'Independent report check';
   const joining=mail.body.split(/\s+/).find(part=>part.startsWith(`${STAGING_ORIGIN}/course-reviews/${round.id}/join/`));
   const email:EmailSnapshot={design,brand:round.document.brand.name,color:round.document.brand.color,logo_path:round.document.brand.logo,organisation_id:round.organisation_id,marketing:false,context:{recipient_name:mail.recipient.split('@')[0],company_name:round.document.brand.name,course_id:round.course_id,course_title:round.document.title,review_id:round.id,review_scope:scope,deadline:round.document.cutoff},instructions:`Your assigned tasks: ${scope}.\nReview cutoff: ${new Date(round.document.cutoff).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST.\n\n${mail.body.slice(0,100000)}`,joining_link:joining};
   snapshot={mode:'configured',subject:renderEmailSet(email).subject,email};
  }else snapshot={mode:'native',subject:mail.subject,body:mail.body};
  // Freeze before delivery: retries must keep the same content and provider key,
  // even when an administrator edits or pauses their template in the meantime.
  snapshot=await messageRpc<InvitationSnapshot>('v2_email_invitation_snapshot',{p_mail:mail.id,p_snapshot:snapshot});
 }
 return snapshot.mode==='configured'?renderEmailSet(snapshot.email):{subject:snapshot.subject,...renderReviewMessage(round,{subject:snapshot.subject,body:snapshot.body,kind:mail.kind})};
}
