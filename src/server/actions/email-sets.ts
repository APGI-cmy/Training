'use server';
import {revalidatePath} from 'next/cache';
import {notificationSession} from '@/server/services/notifications';
import {messageRpc} from '@/server/services/messages';
import {emailSetWorkspace} from '@/server/services/email-sets';
import {uploadEmailImage} from '@/server/services/email-image-upload';
import {renderEmailSet} from '@/server/services/email-set-renderer';
import {validId} from '@/lib/company-structure';
import {parseRecipients} from '@/lib/messages';
import {emailTriggers,emailCadences,emailStarters,validateEmailDesign,type EmailRule,type EmailDesign,type EmailActionState,type EmailLibraryImage} from '@/lib/email-sets';
import {getCourses} from '@/lib/courses';
import {previewTransactionalEmail} from '@/server/services/email/transactional-delivery';
import {reviewInvitationNarrative,renderReviewMessage} from '@/server/services/email/review-message';
import {adminRest} from '@/server/supabase/admin-rest';
import {brandedEmail} from '@/server/services/email/send-course-invitation';
import {getCourseCover} from '@/lib/course-covers';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
import type {ReviewRound} from '@/lib/course-review';
import type {InvitationSnapshot} from '@/server/services/email/review-invitation-template';
import {requireEmailApproval,signEmailApproval,type EmailApproval} from '@/server/services/email-preview-approval';
const field=(form:FormData,key:string)=>String(form.get(key)??'').trim();
const rev=(form:FormData)=>{const r=Number(field(form,'revision'));if(!Number.isSafeInteger(r)||r<1)throw Error('Reload before saving.');return r;};
function designFrom(form:FormData):EmailDesign{const design={subject:field(form,'subject'),heading:field(form,'heading'),body:field(form,'body'),button:field(form,'button'),destination:field(form,'destination') as EmailDesign['destination'],image:field(form,'image')};validateEmailDesign(design);return design;}
function ruleFrom(form:FormData):EmailRule{
 const raw=JSON.parse(field(form,'rule')) as EmailRule;
 if(!Object.hasOwn(emailTriggers,raw.trigger)||!Object.hasOwn(emailCadences,raw.cadence)||!['selected','enrolled','group','reviewers','members','admins'].includes(raw.audience))throw Error('Choose a valid trigger, repeat cycle and audience.');
 const rule:EmailRule={...raw,recipients:raw.recipients.length?parseRecipients(raw.recipients.join('\n')):[]};
 for(const key of ['start_at','end_at','deadline_at'] as const){if(rule[key]&&(!/^\d{4}-\d{2}-\d{2}T/.test(rule[key])||!Number.isFinite(Date.parse(rule[key]))))throw Error('Choose valid dates and times.');}
 if(!Number.isInteger(rule.days_before)||rule.days_before<1||rule.days_before>365)throw Error('Choose 1–365 days notice.');
 if(rule.course_id&&!getCourses().some(c=>c.id===rule.course_id))throw Error('Choose an available course.');
 if(rule.group_id)validId(rule.group_id);
 return rule;
}
function approvalFrom(form:FormData,actor:string):EmailApproval{return {actor,organisation:validId(field(form,'organisation_id')),set:validId(field(form,'set_id')),id:field(form,'id')?validId(field(form,'id')):'',revision:rev(form),name:field(form,'name'),design:designFrom(form),rule:{...ruleFrom(form),policy_confirmed:true}};}
export async function emailSetAction(_:EmailActionState,form:FormData):Promise<EmailActionState>{
 try{
  const session=await notificationSession(),actor=session.user.id,op=field(form,'operation');
  if(op==='upload-image'){
   const company=validId(field(form,'organisation_id'));
   const {workspace}=await emailSetWorkspace();
   if(!workspace.companies.some(c=>c.id===company))throw Error('Administrator access required for this company.');
   const title=field(form,'image_title'),course=field(form,'image_course'),purpose=field(form,'image_purpose');
   if(!title||title.length>120||!['course','email','both'].includes(purpose))throw Error('Enter an image title and choose its intended use.');
   if(course&&!getCourses().some(c=>c.id===course))throw Error('Choose an available course.');
   const uploaded=await uploadEmailImage(company,form.get('graphic'));
   const image=await messageRpc<EmailLibraryImage>('v2_image_library_add',{p_actor:actor,p_org:company,p_title:title,p_course:course,p_purpose:purpose,p_path:uploaded.path});
   revalidatePath('/messages/image-library');revalidatePath('/messages/email-sets');
   return {imageUrl:uploaded.url,image:{...image,url:uploaded.url},success:'Image added to your company library. Select it to use it in the message.'};
  }
  if(op==='starters'){
   const courseId=field(form,'course_id');if(!getCourses().some(c=>c.id===courseId))throw Error('Choose an available course.');
   const setId=await messageRpc<string>('v2_email_seed',{p_actor:actor,p_org:validId(field(form,'organisation_id')),p_course:courseId,p_starters:emailStarters});
   revalidatePath('/messages/email-sets');return {setId,success:'Prepared email set saved as drafts. Choose a saved email to review its wording, graphic and trigger.'};
  }
  if(op==='set'){
   const setId=await messageRpc<string>('v2_email_set_save',{p_actor:actor,p_id:field(form,'id')?validId(field(form,'id')):null,p_org:validId(field(form,'organisation_id')),p_revision:rev(form),p_name:field(form,'name'),p_policy:field(form,'policy_notes')});
   revalidatePath('/messages/email-sets');return {success:'Message set saved. You can add emails to this set.',setId};
  }
  if(op==='save'){
   const approved=approvalFrom(form,actor);requireEmailApproval(field(form,'preview_receipt'),'preview',approved);
   if(field(form,'accept_preview')!=='yes')throw Error('Accept the preview before saving this draft.');
   const entryId=await messageRpc<string>('v2_email_entry_save',{p_actor:actor,p_id:approved.id||null,p_set:approved.set,p_revision:approved.revision,p_name:approved.name,p_design:approved.design,p_rule:approved.rule});
   const savedRevision=approved.id?approved.revision+1:1,savedReceipt=signEmailApproval('saved',{...approved,id:entryId,revision:savedRevision});
   revalidatePath('/messages/email-sets');return {success:'Accepted preview saved as a draft. You can now enable this design.',entryId,savedRevision,savedReceipt};
  }
  if(op==='active'||op==='paused'){
   if(op==='active')requireEmailApproval(field(form,'saved_receipt'),'saved',approvalFrom(form,actor));
   await messageRpc('v2_email_entry_state',{p_actor:actor,p_id:validId(field(form,'id')),p_revision:rev(form),p_state:op});
   revalidatePath('/messages/email-sets');return {success:op==='active'?'Message enabled. Review-request designs apply to new invitations and explicit resends; enabling a design does not resend previous emails. Other message rules are checked about every ten minutes.':'Message paused.'};
  }
  if(op==='preview'){
   const {workspace}=await emailSetWorkspace(),company=workspace.companies.find(c=>c.id===field(form,'organisation_id'));if(!company)throw Error('Administrator access required for this company.');
   const approved=approvalFrom(form,actor);
   if(!workspace.sets.some(set=>set.id===approved.set&&set.organisation_id===company.id))throw Error('Choose a message set in this company.');
   if(approved.id&&!workspace.entries.some(entry=>entry.id===approved.id&&entry.set_id===approved.set&&entry.revision===approved.revision))throw Error('This email changed. Reload before previewing.');
   const rule=ruleFrom(form),course=getCourses().find(c=>c.id===rule.course_id)??getCourses()[0];
   const review=workspace.review_requests.find(r=>r.organisation_id===company.id&&r.course_id===course.id);
   const rendered=renderEmailSet({design:designFrom(form),brand:company.name,color:company.primary_color,logo_path:company.logo_path,marketing:rule.marketing,organisation_id:company.id,instructions:rule.trigger==='review_request'?`${reviewInvitationNarrative(session.user.email!,true)}\n\nYour actual invitation adds the assigned tasks, cutoff and a private first-time joining link.`:undefined,context:{recipient_name:'Example reviewer / learner',company_name:company.name,course_id:course.id,course_title:course.title,review_id:review?.id??'',review_scope:'content, commercials and branding',deadline:review?.cutoff||rule.deadline_at||new Date(Date.now()+14*86400000).toISOString(),days_left:String(rule.days_before),progress_percent:'75',group_name:workspace.groups.find(g=>g.id===rule.group_id)?.name??'Example enrolled group',enrolled_count:'20',completed_count:'18'}});
   return {...previewTransactionalEmail(rendered),previewReceipt:signEmailApproval('preview',approved),success:'Preview ready. Review the email and settings, then select Accept preview. No email has been sent.'};
  }
  if(op==='review-preview'||op==='enrolment-preview'){
   const {workspace}=await emailSetWorkspace(),company=workspace.companies.find(c=>c.id===field(form,'organisation_id'));if(!company)throw Error('Administrator access required for this company.');
   const course=getCourses().find(c=>c.id===field(form,'course_id'));if(!course)throw Error('Choose a course.');
   if(op==='enrolment-preview'){
    const cover=getCourseCover(course.id),subject=`Your ${company.name} course invitation: ${course.title}`;
    const html=brandedEmail({brand:company.name,logo:company.logo_path?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${company.logo_path}`):null,color:company.primary_color,title:course.title,description:`You have been invited to enrol in ${course.title}. ${course.description} Use the invited email, verify your account and save Profile to see your course.`,image:cover?new URL(cover.src,STAGING_ORIGIN).toString():null,link:new URL('/invitations/PREVIEW-ONLY',STAGING_ORIGIN).toString(),button:'Open your course invitation',footer:'Example only. Real invitations contain a private joining link, expiry and the matching company identity. Hosted by APGI.'});
    return {...previewTransactionalEmail({subject,html,text:subject}),success:'Example of the existing branded enrolment invitation. No invitation is created or sent.'};
   }
   const saved=workspace.review_requests.find(r=>r.organisation_id===company.id&&r.course_id===course.id);
   let round:ReviewRound,subject:string,body:string;
   if(saved){
    const response=await adminRest(`/rest/v1/course_review_rounds?id=eq.${saved.id}&select=*&limit=1`);if(!response.ok)throw Error('Review unavailable.');round=(await response.json())[0];
    const recipient=round.document.participants.find(p=>p.email===field(form,'recipient'))??round.document.participants[0];
    const mail=await adminRest(`/rest/v1/course_review_mail?round_id=eq.${saved.id}&kind=eq.invitation&recipient=eq.${encodeURIComponent(recipient.email)}&select=subject,body,email_snapshot&order=created_at.desc&limit=1`);if(!mail.ok)throw Error('Invitation unavailable.');const row=(await mail.json())[0];
    if(!row)throw Error('No saved invitation was found for this reviewer.');subject=row.subject;body=row.body.replace(/\/join\/[A-Za-z0-9_-]+/g,'/join/PREVIEW-LINK-REMOVED');
    const snapshot=row.email_snapshot as InvitationSnapshot|null;
    if(snapshot?.mode==='configured'){
     const safe={...snapshot.email,instructions:snapshot.email.instructions?.replace(/\/join\/[A-Za-z0-9_-]+/g,'/join/PREVIEW-LINK-REMOVED'),joining_link:undefined};
     return {...previewTransactionalEmail(renderEmailSet(safe)),success:'Saved company review invitation preview. Private registration tokens have been removed.'};
    }
   }else{
    round={id:'00000000-0000-4000-8000-000000000000',course_id:course.id,document:{title:course.title,brand:{name:company.name,color:company.primary_color,logo:company.logo_path}}} as ReviewRound;
    subject=`${company.name} — ${course.title}: invitation`;body=`${reviewInvitationNarrative(session.user.email!,true)}\n\nYour assignments: content, commercials and branding (example).\nCut-off: the date selected when requesting review.\n\nSign in with the invited email address. Your real invitation includes your assigned tasks and a private first-time registration link.`;
   }
   const rendered=renderReviewMessage(round,{subject,body});
   return {...previewTransactionalEmail({subject,html:rendered.html,text:body}),success:saved?'Saved review invitation preview. Private registration tokens have been removed.':'Example review invitation. No saved review request exists for this course and company yet.'};
  }
  if(op==='receipt-preview'){
   const id=validId(field(form,'id')),{workspace}=await emailSetWorkspace();const receipt=workspace.activity.find(a=>a.id===id);if(!receipt)throw Error('Delivery unavailable.');
   const r=await adminRest(`/rest/v1/v2_email_outbox?id=eq.${id}&select=snapshot&limit=1`);if(!r.ok)throw Error('Delivery unavailable.');const snapshot=(await r.json())[0]?.snapshot;if(!snapshot)throw Error('Delivery unavailable.');
   return {...previewTransactionalEmail(renderEmailSet(snapshot)),success:'Stored version for this delivery. Acceptance does not prove inbox delivery.'};
  }
  if(op==='preference'){
   await messageRpc('v2_email_preference',{p_actor:actor,p_org:validId(field(form,'organisation_id')),p_opt:field(form,'announcements')==='on'});revalidatePath('/messages/email-preferences');return {success:'Your email preferences are saved.'};
  }
  throw Error('Choose a valid email action.');
 }catch(error){return {error:error instanceof Error?error.message:'The email change could not be saved. Please try again.'};}
}
