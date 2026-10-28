'use server';
import {randomUUID} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {validId,formText} from '@/lib/company-structure';
import {activeFindings} from '@/lib/course-review';
import {currentImplementation,submitImplementation,endorseFinding,reopenOwnFinding} from '@/lib/lu-review-workflow';
import {assertReviewWork,claimReviewer,requireReview,commitReview,reviewEvent,reviewMail,processReviewMail} from '@/server/services/course-reviews';
import type {ReviewActionState} from './course-reviews';
import {reviewNotificationTasks} from '@/lib/review-notification-tasks';
import {syncReviewMessages} from '@/server/services/review-message-sync';
export async function luReviewAction(_:ReviewActionState,form:FormData):Promise<ReviewActionState>{
 try{
  const id=validId(formText(form,'round_id',1)),{round,email,session,fresh}=await requireReview(id);assertReviewWork(round,fresh);
  if(round.document.participants.some(p=>p.email===email))claimReviewer(round,email,session.user.id);
  const f=activeFindings(round.document).find(f=>f.id===formText(form,'finding_id',1));if(!f)throw Error('Finding unavailable. Reload the LU workspace.');
  const op=formText(form,'operation',1),actor={email,userId:session.user.id},at=new Date().toISOString(),r=currentImplementation(round,f);
  if(formText(form,'finding_at',1)!==f.at||formText(form,'response_id')!==(r?.id??''))throw Error('This finding or response changed. Reload before submitting; earlier saved work is safe.');
  const reason=formText(form,'comment',0,5000);let message='';
  if(op==='implementation_submit'){
   submitImplementation(round,f,actor,{id:randomUUID(),at,implemented:formText(form,'implemented',1) as 'yes'|'no',notes:reason});
   message=`Implementation notes (${currentImplementation(round,f)!.number}) submitted. Implementation feedback is recorded. Continue directly to Endorsements: one other reviewer selects Yes to close or No with a reason to reopen.`;
  }else if(op==='implementation_decision'){
   throw Error('The separate response decision has been replaced by Endorsements. Reload and choose Yes—endorse or No—do not endorse there. Earlier saved decisions remain in the record.');
  }else if(op==='finding_endorsement'){
   endorseFinding(round,f,actor,{at,decision:formText(form,'decision',1) as 'yes'|'no',reason});
   message=form.get('decision')==='yes'?'Endorsement recorded. The finding is closed.':'Not endorsed. Your reason is recorded and the record is reopened for correction. No further monitoring is assigned to you.';
  }else if(op==='finding_reopen'){
   reopenOwnFinding(round,f,actor,at,reason);message='Your finding is reopened. Prepare and submit the next correction in Reopened rounds.';
  }else throw Error('Unknown LU review action.');
  round.document.reviewProcessVersion=3;if(round.document.workflow)delete round.document.workflow.contentApproval;
  reviewEvent(round.document,email,op,`${f.unit} · ${f.reference} · ${f.id}: ${message} ${reason}`);
  const source={round,hash:round.fingerprint,brandRevision:round.document.brand.revision};
  const mail=round.document.participants.filter(p=>p.email!==email&&p.state!=='declined').flatMap(p=>{
   const task=reviewNotificationTasks(source,p.email,p.userId??p.email,false).find(t=>t.anchor===`finding-${f.id}`);
   const confirmation=op==='finding_endorsement'&&[f.author,r?.email].includes(p.email);
   if(!task&&!confirmation)return [];
   return reviewMail(round,'finding_workflow_update',`${op}:${f.id}:${round.revision}`,`From: ${email}\nTo: ${p.email}\n${task?.requirement??message}${reason?'\nSaved explanation: '+reason:''}\nOpen this finding: ${process.env.NEXT_PUBLIC_APP_URL}/course-reviews/${id}#finding-${f.id}`,[p.email],false);
  });
  await commitReview(round,session.user.id,op,mail);
  try{await syncReviewMessages(session.user.id,source);}catch{console.error('Review saved; recipient messages will resync on refresh.');}
  try{await processReviewMail();}catch{/* Durable delivery can retry. */}
  revalidatePath(`/course-reviews/${id}`,'layout');revalidatePath('/course-reviews');
  return {success:message,href:`/course-reviews/${id}#finding-${f.id}`};
 }catch(e){if(e instanceof Error&&'digest' in e)throw e;return {error:e instanceof Error?e.message:'The LU review update could not be saved.'};}
}
