import "server-only";
import {cache} from "react";
import {adminRest} from "@/server/supabase/admin-rest";
import {requireSession,type AlpSession} from "@/server/auth/session";
import {notificationTarget,type NotificationInbox,type PersonalNotification} from "@/lib/notifications";
import {presentNotification} from "@/lib/notification-presentation";
import {reviewNotificationTasks,type ReviewTaskSource} from "@/lib/review-notification-tasks";
import type {ReviewRound} from "@/lib/course-review";
import {rows} from "./company-structure";
import {isPlatformPrincipal} from "./platform-principals";
import {contentSource,reviewSource} from "./course-reviews";
export async function notificationSession(){const session=await requireSession();if(!session.user.email_confirmed_at)throw Error("Confirm your email to use notifications.");return session;}
const taskContext=cache(async(session:AlpSession)=>{
 const principal=await isPlatformPrincipal(session),email=session.user.email?.toLowerCase()??"";
 if(!email||!session.user.email_confirmed_at)throw Error("Verified account required.");
 const rounds=await rows<ReviewRound>(`/rest/v1/course_review_rounds?status=eq.open&select=*${principal?"":`&document->participants=cs.${encodeURIComponent(JSON.stringify([{email}]))}`}`);
 const sources=(await Promise.all(rounds.map(async round=>{
  const active=await rows<{id:string}>(`/rest/v1/organisations?id=eq.${round.organisation_id}&is_active=eq.true&select=id&limit=1`);
  if(!active.length)return null;
  const source=round.document.workflow?await contentSource(round.course_id,round.organisation_id):await reviewSource(round.plan_id!);
  return {round,hash:source.fingerprint,brandRevision:source.brand.brand_revision};
 }))).filter((s):s is ReviewTaskSource=>!!s);
 return {principal,email,sources,tasks:sources.flatMap(source=>reviewNotificationTasks(source,email,session.user.id,principal))};
});
async function present(session:AlpSession,items:PersonalNotification[]):Promise<PersonalNotification[]>{
 const {principal,email,sources}=await taskContext(session),rounds=new Map(sources.map(s=>[s.round.id,s.round]));
 const missing=[...new Set(items.filter(n=>n.source_type==="review"&&n.source_id&&!rounds.has(n.source_id)).map(n=>n.source_id!))];
 if(missing.length){
  const earlier=await rows<ReviewRound>(`/rest/v1/course_review_rounds?id=in.(${missing.join(",")})&select=*`);
  for(const round of earlier)if(principal||round.document.participants.some(p=>p.email===email))rounds.set(round.id,round);
 }
 return items.map(n=>presentNotification(n,n.source_id?rounds.get(n.source_id):undefined,principal,email));
}
export const notificationInbox=cache(async(session:AlpSession,filter="all",offset=0,summary=false):Promise<NotificationInbox>=>{
 const {tasks,sources}=await taskContext(session);
 const response=await adminRest("/rest/v1/rpc/v3_notification_inbox",{method:"POST",body:JSON.stringify({p_user:session.user.id,p_tasks:tasks,p_revisions:sources.map(s=>({id:s.round.id,revision:s.round.revision})),p_filter:filter,p_offset:offset,p_summary:summary})});
 if(!response.ok)throw Error("Notifications are temporarily unavailable. Please try again.");
 const inbox:NotificationInbox=await response.json();
 if(summary)return inbox;
 const [items,receipts]=await Promise.all([present(session,inbox.items),present(session,inbox.receipts??[])]);
 return {...inbox,items,receipts:receipts as NotificationInbox["receipts"]};
});
export async function notificationDestination(session:AlpSession,id:string){
 await notificationInbox(session,"all",0,true);
 const response=await adminRest("/rest/v1/rpc/v3_notification_one",{method:"POST",body:JSON.stringify({p_user:session.user.id,p_id:id})});
 if(!response.ok)throw Error("Notification unavailable.");const item:PersonalNotification|null=await response.json();
 if(!item)throw Error("Notification unavailable.");return (await present(session,[item]))[0];
}
export async function notificationTargets(session:AlpSession,path:string,selected:string|null){
 if(notificationTarget(path)!==path||path==="/notifications")return [];
 await notificationInbox(session,"all",0,true);
 const response=await adminRest("/rest/v1/rpc/v3_notification_targets",{method:"POST",body:JSON.stringify({p_user:session.user.id,p_path:path,p_selected:selected})});
 if(!response.ok)throw Error("Notification references unavailable.");
 const items=await present(session,await response.json());
 return items.filter(n=>n.target_path?.split("#")[0]===path&&(n.pending||n.id===selected&&n.response_type!=="action"));
}
