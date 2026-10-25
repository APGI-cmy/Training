import 'server-only';
import {notificationSession} from './notifications';
import {messageRpc} from './messages';
import {adminRest} from '@/server/supabase/admin-rest';
import {emailConfiguration} from './email/transactional-delivery';
import type {MailWorkspace,MailDetail} from '@/lib/mail-tracking';
export async function mailWorkspace(query:{search?:string;category?:string;state?:string;offset?:number;company?:string}){
 const session=await notificationSession();
 const workspace=await messageRpc<MailWorkspace>('v2_mail_workspace',{p_actor:session.user.id,p_search:(query.search??'').slice(0,200),p_category:query.category??'',p_state:query.state??'',p_offset:query.offset??0,p_company:query.company||null});
 return {session,workspace,eventsConfigured:!!process.env.STAGING_RESEND_WEBHOOK_SECRET};
}
export async function managedMail(id:string){
 const session=await notificationSession();
 const detail=await messageRpc<MailDetail>('v2_mail_detail',{p_actor:session.user.id,p_id:id});
 const result=await adminRest(`/rest/v1/v2_mail_messages?id=eq.${id}&select=*&limit=1`);
 if(!result.ok)throw Error('Email unavailable.');const row=(await result.json())[0];if(!row)throw Error('Email unavailable.');
 return {session,detail,row:row as {id:string;message_key:string;organisation_id:string|null;source_id:string|null;category:string;recipient:string;subject:string}};
}
export async function checkMailDelivery(id:string){
 const {detail}=await managedMail(id),attempt=detail.attempts[0];
 if(!attempt?.provider_id)throw Error('There is no provider acceptance reference for this email yet.');
 const config=emailConfiguration(),key=(config?.staging?process.env.STAGING_RESEND_READ_API_KEY:process.env.RESEND_READ_API_KEY)||config?.apiKey;
 const readKey=config?.staging?process.env.STAGING_RESEND_READ_API_KEY:process.env.RESEND_READ_API_KEY;
 if(!readKey&&(config?.staging?process.env.STAGING_RESEND_WEBHOOK_SECRET:process.env.RESEND_WEBHOOK_SECRET))return 'events';
 if(!key)throw Error('Email provider is not configured.');
 const response=await fetch(`https://api.resend.com/emails/${encodeURIComponent(attempt.provider_id)}`,{headers:{authorization:`Bearer ${key}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(response.status===401||response.status===403)throw Error('Delivery updates are not connected yet. The sending key cannot read delivery history. APGI must connect Resend tracking.');
 if(!response.ok)throw Error(response.status===429?'Please wait before checking again.':'The provider could not return delivery history. Earlier evidence is retained.');
 const payload=await response.json() as {id?:string;last_event?:string};
 if(payload.id!==attempt.provider_id||!['sent','delivered','delivery_delayed','opened','clicked','bounced','complained','failed','suppressed'].includes(payload.last_event??''))throw Error('The provider has not supplied a recognised delivery update.');
 // A lookup gives a current status, not the historical time an open happened.
 const saved=await adminRest(`/rest/v1/v2_mail_attempts?id=eq.${attempt.id}`,{method:'PATCH',body:JSON.stringify({provider_observation:payload.last_event,checked_at:new Date().toISOString()})});
 if(!saved.ok)throw Error('Delivery update could not be saved.');return payload.last_event;
}
