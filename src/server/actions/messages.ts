"use server";
import {randomUUID} from "node:crypto";
import {revalidatePath} from "next/cache";
import {notificationSession} from "@/server/services/notifications";
import {messageRpc,messageAttachment,flushMessageMail} from "@/server/services/messages";
import {validId} from "@/lib/company-structure";
import {parseRecipients,sastInput,type MessageState} from "@/lib/messages";
const value=(f:FormData,key:string)=>String(f.get(key)??'').trim();
export async function messageAction(_previous:MessageState,form:FormData):Promise<MessageState>{
 try{
  const session=await notificationSession(),actor=session.user.id,op=value(form,'operation');let threadId:string|undefined;
  if(op==='send'){
   const attachment=await messageAttachment(form.get('attachment'));
   threadId=await messageRpc<string>('v2_message_send',{p_actor:actor,p_id:validId(value(form,'message_id')),p_thread:value(form,'thread_id')?validId(value(form,'thread_id')):null,p_org:value(form,'organisation_id')?validId(value(form,'organisation_id')):null,p_subject:value(form,'subject'),p_body:value(form,'body'),p_to:value(form,'to')?.toLowerCase()||null,p_attachment:attachment});
  }else if(['escalate','close','reopen'].includes(op)){
   threadId=validId(value(form,'thread_id'));await messageRpc<void>('v2_message_manage',{p_actor:actor,p_thread:threadId,p_operation:op});
   if(op==='escalate')await messageRpc('v2_message_send',{p_actor:actor,p_id:randomUUID(),p_thread:threadId,p_org:null,p_subject:'',p_body:'This conversation has been escalated to APGI administration for assistance.'});
  }else if(op==='template'){
   await messageRpc('v2_message_template_save',{p_actor:actor,p_id:value(form,'id')?validId(value(form,'id')):null,p_name:value(form,'name'),p_subject:value(form,'subject'),p_body:value(form,'body')});
  }else if(op==='schedule'){
   const recipients=parseRecipients(form.get('recipients')),cadence=value(form,'cadence');
   await messageRpc('v2_message_schedule_save',{p_actor:actor,p_org:validId(value(form,'organisation_id')),p_subject:value(form,'subject'),p_body:value(form,'body'),p_recipients:recipients,p_cadence:cadence,p_next:value(form,'start')?sastInput(value(form,'start')):new Date().toISOString(),p_end:value(form,'end')?sastInput(value(form,'end')):null});
   // The durable schedule is saved before any delivery is attempted. The cron retries queued mail.
  }else if(op==='toggle')await messageRpc<void>('v2_message_schedule_toggle',{p_actor:actor,p_id:validId(value(form,'id'))});
  else throw Error('Choose a valid message action.');
  revalidatePath('/messages','layout');revalidatePath('/notifications');
  let suffix='';if(threadId&&op!=='close'&&op!=='reopen'){try{const mail=await flushMessageMail(threadId);suffix=mail.accepted?' Email accepted by the provider.': ' Email is queued for delivery.';}catch{suffix=' Email is queued for retry.';}}
  return {threadId,success:op==='template'?'Message template saved.':op==='schedule'?'Message schedule saved. It will run at the next scheduled dispatch (within 10 minutes).':op==='toggle'?'Schedule updated.':`Conversation ${op==='close'?'closed':op==='reopen'?'reopened':op==='escalate'?'escalated to APGI':'saved'}.${suffix}`};
 }catch(error){if(error instanceof Error&&'digest' in error)throw error;return {error:error instanceof Error?error.message:'Message could not be saved.'};}
}
