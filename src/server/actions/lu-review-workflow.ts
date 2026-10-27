'use server';
import {randomUUID} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {validId,formText} from '@/lib/company-structure';
import {activeFindings} from '@/lib/course-review';
import {currentImplementation,submitImplementation,decideImplementation,endorseFinding,reopenOwnFinding} from '@/lib/lu-review-workflow';
import {assertReviewWork,claimReviewer,requireReview,commitReview,reviewEvent,reviewMail,processReviewMail} from '@/server/services/course-reviews';
import type {ReviewActionState} from './course-reviews';
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
   message=`Implementation notes (${currentImplementation(round,f)!.number}) submitted. ${f.author===email?'Another reviewer can endorse your record.':'The original reviewer can now accept or reject this response.'}`;
  }else if(op==='implementation_decision'){
   decideImplementation(round,f,actor,{at,decision:formText(form,'decision',1) as 'accept'|'reopen',reason});
   message=form.get('decision')==='reopen'?'Finding reopened. The designer can now prepare the next correction. No new implementation notes exist until submission.':'Response accepted. Your response loop is complete; one other reviewer endorses the completed record.';
  }else if(op==='finding_endorsement'){
   endorseFinding(round,f,actor,{at,decision:formText(form,'decision',1) as 'yes'|'no',reason});
   message=form.get('decision')==='yes'?'Endorsement recorded. The finding is closed.':'Not endorsed. Your reason is recorded; no further monitoring is assigned to you.';
  }else if(op==='finding_reopen'){
   reopenOwnFinding(round,f,actor,at,reason);message='Your finding is reopened. Prepare and submit the next correction in Reopened rounds.';
  }else throw Error('Unknown LU review action.');
  round.document.reviewProcessVersion=3;if(round.document.workflow)delete round.document.workflow.contentApproval;
  reviewEvent(round.document,email,op,`${f.unit} · ${f.reference} · ${f.id}: ${message} ${reason}`);
  const mail=reviewMail(round,'finding_workflow_update',`${op}:${f.id}:${round.revision}`,`${email}: ${f.unit.toUpperCase()} · ${f.reference}. ${message}${reason?' '+reason:''}\nOpen this finding: ${process.env.NEXT_PUBLIC_APP_URL}/course-reviews/${id}#finding-${f.id}`);
  await commitReview(round,session.user.id,op,mail);try{await processReviewMail();}catch{/* Durable delivery can retry. */}
  revalidatePath(`/course-reviews/${id}`,'layout');revalidatePath('/course-reviews');
  return {success:message,href:`/course-reviews/${id}#finding-${f.id}`};
 }catch(e){if(e instanceof Error&&'digest' in e)throw e;return {error:e instanceof Error?e.message:'The LU review update could not be saved.'};}
}
