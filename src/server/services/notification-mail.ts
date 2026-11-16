import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {deliverTransactionalEmail,emailConfiguration} from './email/transactional-delivery';
import {notificationEmail,type NotificationMail} from '@/lib/notification-email';
export async function flushNotificationMail(){
 const config=emailConfiguration();if(!config)return {configured:false,accepted:0,failed:0};
 const response=await adminRest('/rest/v1/rpc/v5_claim_notification_mail',{method:'POST',body:'{}'});
 if(!response.ok)throw Error('Notification email queue unavailable');
 const jobs:NotificationMail[]=await response.json();let accepted=0,failed=0;
 // Space sends below the provider rate limit; the durable queue retries failures.
 for(const job of jobs){
  if(accepted+failed)await new Promise(resolve=>setTimeout(resolve,550));
  const message=notificationEmail(job,config.origin),key=`notification:${job.id}`;
  const result=await deliverTransactionalEmail({to:job.email,...message,idempotencyKey:key,tracking:{category:'system',sourceId:job.sourceId??undefined,messageKey:key}});
  const saved=await adminRest('/rest/v1/rpc/v5_finish_notification_mail',{method:'POST',body:JSON.stringify({p_id:job.id,p_claim:job.claimToken,p_provider:result.ok?result.providerMessageId:null,p_error:result.ok?null:result.error})});
  if(!saved.ok)throw Error('Email acceptance is awaiting reconciliation');
  if(result.ok)accepted++;else failed++;
 }
 return {configured:true,accepted,failed};
}
