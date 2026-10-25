'use server';
import {randomUUID} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {managedMail,checkMailDelivery} from '@/server/services/mail-management';
import {messageRpc} from '@/server/services/messages';
import {adminRest} from '@/server/supabase/admin-rest';
import {resendInvitation} from './invitations/resend-invitation';
import {requestPasswordRecovery} from './auth/password-recovery';
import {deliverTransactionalEmail} from '@/server/services/email/transactional-delivery';
import {renderEmailSet,type EmailSnapshot} from '@/server/services/email-set-renderer';
import {brandedEmail} from '@/server/services/email/send-course-invitation';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
import {validId} from '@/lib/company-structure';
import type {MailActionState} from '@/lib/mail-tracking';
import type {MailTracking} from '@/server/services/email/delivery-ledger';
export async function mailManagementAction(_:MailActionState,form:FormData):Promise<MailActionState>{
 try{
  const id=validId(String(form.get('id')??'')),operation=String(form.get('operation')??'');
  const {session,detail,row}=await managedMail(id),actor=session.user.id;
  if(operation==='detail')return {detail};
  if(operation==='check'){const result=await checkMailDelivery(id);revalidatePath('/messages/email-management');return {success:result==='events'?'Status refreshed from the platform’s signed provider updates. Older events may be unavailable.':'Delivery update checked. Opening an email does not accept an invitation.'};}
  if(operation==='followup'){
   const state=String(form.get('state')??''),note=String(form.get('note')??'').trim(),raw=String(form.get('due')??'');
   if(!['open','waiting','done'].includes(state)||note.length>2000||raw&&!Number.isFinite(Date.parse(raw)))throw Error('Check the follow-up details.');
   await messageRpc('v2_mail_manage',{p_actor:actor,p_id:id,p_action:'followup',p_note:note,p_state:state,p_due:raw?new Date(raw).toISOString():null});
   revalidatePath('/messages/email-management');return {success:'Follow-up saved.'};
  }
  if(operation!=='resend')throw Error('Choose a valid action.');
  const message=await messageRpc<typeof row&{html:string|null;body:string|null}>('v2_mail_manage',{p_actor:actor,p_id:id,p_action:'resend'});
  if(['admin_invitation','company_invitation'].includes(row.category)){
   const invitation=new FormData();invitation.set('invitationId',row.source_id??'');
   const result=await resendInvitation({ok:false},invitation);
   if(!result.ok)throw Error(result.error==='INVITATION_NOT_ACTIVE'?'This invitation was accepted, revoked or expired. It cannot be resent.':result.error==='WAIT_ONE_MINUTE_BEFORE_RESENDING'?'Please wait one minute before resending.':'Invitation could not be resent. Check its current status.');
  }else if(['account_recovery','account_confirmation'].includes(row.category)){
   const recovery=new FormData();recovery.set('email',row.recipient);
   const result=await requestPasswordRecovery({},recovery);if(result.error)throw Error(result.error);
   revalidatePath('/messages/email-management');return {success:'Fresh sign-in help requested for the same recipient. Old private links are never copied. Check the newest email and delivery record.'};
  }else{
   let rendered:{subject:string;html:string;text:string}|undefined;
   if(row.category==='email_set'){
    const source=await adminRest(`/rest/v1/v2_email_outbox?id=eq.${encodeURIComponent(row.source_id??'')}&select=snapshot&limit=1`);
    const saved=source.ok?(await source.json())[0]:null;if(!saved)throw Error('Saved email unavailable.');
    rendered=renderEmailSet(saved.snapshot as EmailSnapshot);
   }else if(row.category==='support'){
    const source=await adminRest(`/rest/v1/v2_messages?id=eq.${encodeURIComponent(row.source_id??'')}&select=thread_id&limit=1`);
    const saved=source.ok?(await source.json())[0]:null;if(!saved)throw Error('Conversation unavailable.');
    // Permission is checked again against the actual current conversation.
    if(!(await messageRpc<boolean>('v2_message_access',{p_actor:actor,p_thread:saved.thread_id})))throw Error('Conversation unavailable.');
    if(message.html&&message.body)rendered={subject:row.subject,html:message.html,text:message.body};
    else{
     const link=`${STAGING_ORIGIN}/messages/${saved.thread_id}`;
     rendered={subject:row.subject,text:`A saved message is available in Messages and support. Sign in with ${row.recipient}. Read and reply: ${link}`,html:brandedEmail({brand:'APGI Training',title:row.subject,description:'A saved message is available in Messages and support. Sign in with the email address this message was sent to.',link,button:'Read and reply',footer:'Reply securely inside the platform.'})};
    }
   }else if(row.category==='policy'){
    const source=await adminRest(`/rest/v1/policy_reviewers?policy_id=eq.${encodeURIComponent(row.source_id??'')}&email=eq.${encodeURIComponent(row.recipient)}&select=email&limit=1`);
    if(!source.ok||!(await source.json()).length)throw Error('This recipient is no longer assigned to the policy.');
    const policy=await adminRest(`/rest/v1/platform_policy_versions?id=eq.${encodeURIComponent(row.source_id??'')}&status=eq.submitted&select=id&limit=1`);
    if(!policy.ok||!(await policy.json()).length)throw Error('This policy is no longer awaiting review.');
    const link=`${STAGING_ORIGIN}/policies/${row.source_id}`;
    rendered={subject:row.subject,text:`A policy is ready for your review. Sign in: ${link}. Opening the link does not approve anything.`,html:brandedEmail({brand:'APGI Training',title:row.subject,description:'A policy is ready for your review. Opening the link does not record approval. Please submit your decision inside the platform.',link,button:'Read policy',footer:'Sign in using this invited email address.'})};
   }else if(message.html&&message.body)rendered={subject:row.subject,html:message.html,text:message.body};
   if(!rendered)throw Error('This security-sensitive email cannot be copied. Use its original setup process to send a fresh request.');
   const subject=rendered.subject.replace(/^\[APGI V2 TEST\] /,'');
   const result=await deliverTransactionalEmail({to:row.recipient,...rendered,subject,idempotencyKey:`managed-resend-${id}-${randomUUID()}`,tracking:{category:row.category as MailTracking['category'],organisationId:row.organisation_id,sourceId:row.source_id??undefined,actorId:actor,messageKey:row.message_key}});
   if(!result.ok)throw Error('Email was not confirmed by the provider. Its attempt is recorded; check delivery history before retrying.');
  }
  revalidatePath('/messages/email-management');return {success:'Resent to the original recipient. Provider acceptance is recorded; delivery and opening are separate events.'};
 }catch(error){return {error:error instanceof Error?error.message:'The email action could not be completed.'};}
}
