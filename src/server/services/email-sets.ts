import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {notificationSession} from '@/server/services/notifications';
import {messageRpc} from '@/server/services/messages';
import {deliverTransactionalEmail,emailConfiguration} from '@/server/services/email/transactional-delivery';
import {renderEmailSet,type EmailSnapshot} from './email-set-renderer';
import type {EmailWorkspace} from '@/lib/email-sets';

export async function emailSetWorkspace(){
 const session=await notificationSession();
 return {session,workspace:await messageRpc<EmailWorkspace>('v2_email_workspace',{p_actor:session.user.id})};
}
export async function runEmailSets(){
 // Preserve queued work when the transport is unavailable.
 if(!emailConfiguration())return {queued:0,accepted:0,failed:0,configured:false};
 const queued=await messageRpc<number>('v2_email_queue',{});
 const jobs=await messageRpc<{id:string;recipient:string;snapshot:EmailSnapshot}[]>('v2_email_claim',{});
 let accepted=0,failed=0;
 for(let i=0;i<jobs.length;i+=5)await Promise.all(jobs.slice(i,i+5).map(async job=>{
  const rendered=renderEmailSet(job.snapshot);
  const result=await deliverTransactionalEmail({to:job.recipient,...rendered,idempotencyKey:`email-set-${job.id}`});
  const saved=await adminRest(`/rest/v1/v2_email_outbox?id=eq.${job.id}&state=eq.sending`,{method:'PATCH',body:JSON.stringify({state:result.ok?'accepted':'failed',provider_id:result.ok?result.providerMessageId:null,last_error:result.ok?null:'The provider did not confirm acceptance. Queued for retry.',next_at:new Date(Date.now()+15*60000).toISOString()})});
  if(!saved.ok)throw Error('Email status is awaiting reconciliation.');
  if(result.ok)accepted++;else failed++;
 }));
 return {queued,accepted,failed,configured:true};
}
