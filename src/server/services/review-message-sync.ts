import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {reviewNotificationTasks,type ReviewTaskSource} from '@/lib/review-notification-tasks';

export async function syncReviewMessages(actorId:string,source:ReviewTaskSource){
 const response=await adminRest('/rest/v1/rpc/v4_review_message_recipients',{method:'POST',body:JSON.stringify({p_actor:actorId,p_round:source.round.id})});
 if(!response.ok)throw Error('Review message recipients could not be checked.');
 const recipients:{id:string;email:string;principal:boolean}[]=await response.json();
 const tasks=recipients.flatMap(p=>reviewNotificationTasks(source,p.email,p.id,p.principal).map(t=>({...t,recipientUserId:p.id})));
 const result=await adminRest('/rest/v1/rpc/v4_sync_review_messages',{method:'POST',body:JSON.stringify({p_actor:actorId,p_round:source.round.id,p_revision:source.round.revision,p_tasks:tasks})});
 if(!result.ok)throw Error('Review messages changed. Refresh to try again.');
}
