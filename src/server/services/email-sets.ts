import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {notificationSession} from '@/server/services/notifications';
import {messageRpc} from '@/server/services/messages';
import {deliverTransactionalEmail,emailConfiguration} from '@/server/services/email/transactional-delivery';
import {renderEmailSet,type EmailSnapshot} from './email-set-renderer';
import type {EmailWorkspace,EmailLibraryImage} from '@/lib/email-sets';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {emailStarters} from '@/lib/email-sets';

export async function emailSetWorkspace(){
 const session=await notificationSession();
 let workspace=await messageRpc<EmailWorkspace>('v2_email_workspace',{p_actor:session.user.id});
 // Lazily provision company-owned drafts, using only the companies this verified
 // administrator can already manage. Repeated/parallel opens are idempotent.
 const missing=workspace.companies.filter(company=>!workspace.sets.some(set=>set.organisation_id===company.id));
 if(missing.length){await Promise.all(missing.map(company=>messageRpc('v2_email_seed',{p_actor:session.user.id,p_org:company.id,p_course:null,p_starters:emailStarters})));workspace=await messageRpc<EmailWorkspace>('v2_email_workspace',{p_actor:session.user.id});}
 const images=await messageRpc<EmailLibraryImage[]>('v2_image_library_list',{p_actor:session.user.id});
 return {session,workspace:{...workspace,images:images.map(image=>({...image,url:getSupabaseRestUrl(`/storage/v1/object/public/email-message-images/${image.object_path}`)!}))}};
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
