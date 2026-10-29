import 'server-only';
import {createHash} from 'node:crypto';
import {rows} from './company-structure';
import {adminRest} from '@/server/supabase/admin-rest';
import type {ReviewRound} from '@/lib/course-review';
import {reviewResponseRequests,reviewNonresponseNotice} from '@/lib/review-nonresponse';
type Mail={notification_key:string;recipient:string;kind:string;body:string;created_at:string};
export async function queueReviewResponseRequests(rounds:ReviewRound[]){
 let queued=0;
 for(const round of rounds.filter(r=>r.document.nonresponsePolicy?.version===1)){
  const known=await rows<{request_key:string;notified_at:string|null;state:string}>(`/rest/v1/course_review_response_requests?round_id=eq.${round.id}&select=request_key,notified_at,state`),keys=new Set(known.filter(k=>k.notified_at||k.state!=='pending').map(k=>k.request_key));
  const requests=reviewResponseRequests(round).filter(r=>!keys.has(r.key));if(!requests.length)continue;
  const mail=await rows<Mail>(`/rest/v1/course_review_mail?round_id=eq.${round.id}&created_at=gte.${encodeURIComponent(round.document.nonresponsePolicy!.enabledAt)}&select=notification_key,recipient,kind,body,created_at&order=created_at.desc`);
  const additions:{key:string;to:string;kind:string;subject:string;body:string}[]=[],planned:(typeof requests[number]&{noticeKey:string})[]=[];
  for(const recipient of [...new Set(requests.map(r=>r.recipient))]){
   const pending=requests.filter(r=>r.recipient===recipient),fresh:typeof pending=[];
   for(const request of pending){const reusable=mail.find(m=>m.recipient===recipient&&m.body.includes('Seven-day response rule:')&&Date.parse(m.created_at)>=Date.parse(request.requestedAt)&&(request.kind==='initial'&&['invitation','review_policy_notice'].includes(m.kind)||request.kind==='endorsement'&&m.body.includes(`#finding-${request.findingId}`)));
    if(reusable)planned.push({...request,noticeKey:reusable.notification_key});else fresh.push(request);
   }
   if(fresh.length){const digest=createHash('sha256').update(fresh.map(r=>r.key).sort().join('\n')).digest('hex').slice(0,24),key=`response-request:${round.id}:${digest}:${recipient}`;
    additions.push({key,to:recipient,kind:'review_response_request',subject:`${round.document.title}: seven-day content response request`,body:`To: ${recipient}\n\n${fresh.map(r=>`${r.requirement}\nOpen: ${process.env.NEXT_PUBLIC_APP_URL}/course-reviews/${round.id}#${r.anchor}`).join('\n\n')}\n\n${reviewNonresponseNotice}\nThe seven-day period begins when this notice is successfully sent. A discussion reply or review action recorded on the platform stops the relevant non-response timer.`});
    for(const request of fresh)planned.push({...request,noticeKey:key});
   }
  }
  const result=await adminRest('/rest/v1/rpc/v3_queue_review_responses',{method:'POST',body:JSON.stringify({p_round:round.id,p_revision:round.revision,p_requests:planned,p_mail:additions})});
  if(result.ok)queued+=Number(await result.json());else console.error('Response notices deferred after a concurrent review change.');
 }
 return queued;
}
export async function processReviewNonresponses(){const result=await adminRest('/rest/v1/rpc/v3_process_review_nonresponses',{method:'POST',body:'{}'});if(!result.ok)throw Error('Nonresponse run incomplete; durable requests retained.');return Number(await result.json());}
