import "server-only";
import {createHash} from "node:crypto";
import {adminRest} from "@/server/supabase/admin-rest";
import {notificationSession} from "@/server/services/notifications";
import {deliverTransactionalEmail,emailConfiguration} from "@/server/services/email/transactional-delivery";
import {brandedEmail} from "@/server/services/email/send-course-invitation";
import type {MessageWorkspace,MessageThread,SavedMessage} from "@/lib/messages";
export async function messageRpc<T>(name:string,args:object):Promise<T>{
 const response=await adminRest(`/rest/v1/rpc/${name}`,{method:"POST",body:JSON.stringify(args)});
 if(!response.ok){const detail=await response.json().catch(()=>({}));throw Error(detail.code==='P0001'?detail.message:"Messages are temporarily unavailable. Please try again.");}
 return response.json();
}
export async function messageWorkspace(){const session=await notificationSession();return {session,workspace:await messageRpc<MessageWorkspace>("v2_message_workspace",{p_actor:session.user.id})};}
export async function messageDetail(id:string){const session=await notificationSession();return {session,detail:await messageRpc<{thread:MessageThread;canManage:boolean;messages:SavedMessage[]}>("v2_message_detail",{p_actor:session.user.id,p_thread:id})};}
type Outgoing={message_id:string;email:string;subject:string;body:string;thread_id:string;sender_email:string;attachment:string|null;organisation_id:string};
export async function flushMessageMail(thread?:string){
 const config=emailConfiguration();if(!config)return {accepted:0,failed:0,configured:false};
 const jobs=await messageRpc<Outgoing[]>("v2_message_mail_claim",{p_thread:thread??null});let accepted=0,failed=0;
 for(let start=0;start<jobs.length;start+=5){await Promise.all(jobs.slice(start,start+5).map(async job=>{
  let brand="APGI Training",color="#102b47";
  const org=await adminRest(`/rest/v1/organisations?id=eq.${job.organisation_id}&select=name,primary_color&limit=1`);
  if(org.ok){const row=(await org.json())[0];if(row){brand=row.name;color=row.primary_color;}}
  const link=new URL(`/messages/${job.thread_id}`,config.origin).toString();
  const text=`From: ${job.sender_email}\n\n${job.body}\n\n${job.attachment?'An attachment is available securely in the conversation.\n\n':''}Read and reply: ${link}\n\nSign in using ${job.email}. If you have not activated your V2 account, use your existing V2 invitation or contact APGI for access. Reply in Messages and support; replies to this email are not added to the conversation.`;
  const html=brandedEmail({brand,color,title:job.subject,description:text,link,button:"Read and reply",footer:"Message receipts confirm reading in the platform. Email accepted means the provider accepted the message; it is not proof of inbox delivery."}).replace('style="line-height:1.6"','style="line-height:1.6;white-space:pre-line"');
  const result=await deliverTransactionalEmail({to:job.email,subject:job.subject,text,html,idempotencyKey:createHash('sha256').update(`support:${job.message_id}:${job.email}`).digest('hex')});
  const saved=await adminRest(`/rest/v1/v2_message_deliveries?message_id=eq.${job.message_id}&email=eq.${encodeURIComponent(job.email)}&state=eq.sending`,{method:"PATCH",body:JSON.stringify({state:result.ok?"accepted":"failed",provider_id:result.ok?result.providerMessageId:null,next_at:new Date(Date.now()+15*60000).toISOString()})});
  if(!saved.ok)throw Error("Message saved. Email status is awaiting reconciliation.");if(result.ok)accepted++;else failed++;
 }));}
 return {accepted,failed,configured:true};
}
export async function runMessageSchedules(){const processed=await messageRpc<number>("v2_message_schedule_tick",{});return {processed,...await flushMessageMail()};}
export async function messageAttachment(file:FormDataEntryValue|null){
 if(!file||typeof file==='string'||file.size===0)return null;
 if(file.size>2*1024*1024)throw Error("Attachments must be 2 MB or smaller.");
 const bytes=Buffer.from(await file.arrayBuffer());let mime:string;
 if(bytes.subarray(0,5).toString()==='%PDF-')mime='application/pdf';
 else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';
 else if(file.name.toLowerCase().endsWith('.txt')&&!bytes.includes(0)&&!bytes.toString('utf8').includes('\uFFFD'))mime='text/plain';
 else throw Error("Attach a PDF, PNG, JPG or plain text file.");
 return {name:file.name.replace(/[^a-z0-9 ._()-]/gi,'_').slice(0,180)||'attachment',mime,data:bytes.toString('base64')};
}
