import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
export type MailTracking={category:'admin_invitation'|'company_invitation'|'account_recovery'|'account_confirmation'|'email_set'|'support'|'policy'|'payment'|'system';organisationId?:string|null;sourceId?:string;actorId?:string|null;messageKey?:string};
export async function beginMailAttempt(input:{tracking:MailTracking;to:string;subject:string;html:string;text:string;idempotencyKey:string}){
 const t=input.tracking;
 const response=await adminRest('/rest/v1/rpc/v2_mail_begin',{method:'POST',body:JSON.stringify({p_key:t.messageKey??input.idempotencyKey,p_attempt:input.idempotencyKey,p_org:t.organisationId??null,p_category:t.category,p_source:t.sourceId??null,p_recipient:input.to,p_subject:input.subject,p_actor:t.actorId??null,p_html:input.html,p_body:input.text})});
 if(!response.ok)throw Error('EMAIL_TRACKING_UNAVAILABLE');
 return response.json() as Promise<{id:string;state:string;provider_id:string|null}>;
}
export async function finishMailAttempt(id:string,result:{providerId?:string;error?:string}){
 const response=await adminRest(`/rest/v1/v2_mail_attempts?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({state:result.providerId?'accepted':'failed',provider_id:result.providerId??null,error:result.error??null})});
 if(!response.ok)throw Error('EMAIL_TRACKING_UNAVAILABLE');
}
