import Link from "next/link";
import {notificationSession,notificationInbox} from "@/server/services/notifications";
import {notificationStatus,notificationReference} from "@/lib/notifications";
import {NotificationControls} from "@/components/notifications/NotificationControls";
import {NotificationSentMessages} from "@/components/notifications/NotificationSentMessages";
import {NotificationAddress} from "@/components/notifications/NotificationAddress";
import "./notifications.css";
export const dynamic="force-dynamic";
const date=(at:string)=>new Date(at).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"});
export default async function NotificationsPage({searchParams}:{searchParams:Promise<{view?:string;page?:string}>}){
 const session=await notificationSession(),query=await searchParams,filter=["unread","response"].includes(query.view??"")?query.view!:"all",page=Math.min(200,Math.max(0,Number.parseInt(query.page??"0",10)||0));
 const inbox=await notificationInbox(session,filter,page*50);
 return <main className="notification-page"><h1>Notifications</h1><p>Each request has a permanent notification reference, a description of what is needed and a link to the exact record. The matching reference appears beside outstanding actions. Reading does not complete an action; completed requests remain in this history.</p><p>Updates and requests for your attention. Opening an update records a read receipt. Acknowledging receipt does not approve content, branding, prices or agreements; complete those decisions in their workflow.</p>
 <p className="notification-totals"><strong>{inbox.unread} unread</strong><strong>{inbox.responses} need a response</strong></p>
 <nav className="notification-filters" aria-label="Notification filters">{[["all","All updates"],["unread","Unread"],["response","Needs a response"]].map(([view,label])=><Link key={view} href={`/notifications?view=${view}`} aria-current={filter===view?"page":undefined}>{label}</Link>)}</nav>
 {inbox.items.some(n=>n.target_path==="/notifications#archived-company-request")?<aside id="archived-company-request" className="notification-card"><h2>Archived company requests</h2><p>These updates concern companies that are inactive or no longer available. Their history is retained and no response is required.</p></aside>:null}
 {inbox.unread>0?<NotificationControls all/>:null}
 {inbox.items.length?inbox.items.map(n=><article id={`notification-${n.id}`} className="notification-card" data-unread={!n.read_at} key={n.id}><p className="notification-reference-label"><strong>{notificationReference(n)}</strong></p><NotificationAddress recipient={session.user.email} sender={n.sender_email}/><h2>{n.message}</h2><p>{n.requirement}</p><p>{date(n.created_at)} SAST · <strong>{notificationStatus(n)}</strong>{n.read_at&&n.pending?" · Read":""}</p>{n.read_at?<p>Read: {date(n.read_at)} SAST{n.acknowledged_at?` · Acknowledged: ${date(n.acknowledged_at)} SAST`:""}</p>:null}{n.resolved_at?<p>No longer outstanding when checked: {date(n.resolved_at)} SAST. The read and response history is retained.</p>:null}<NotificationControls item={n}/></article>):<p>No notifications in this view.</p>}
 <nav className="notification-filters" aria-label="Notification pages">{page>0?<Link href={`/notifications?view=${filter}&page=${page-1}`}>Newer updates</Link>:null}{(page+1)*50<inbox.total?<Link href={`/notifications?view=${filter}&page=${page+1}`}>Older updates</Link>:null}</nav>
 <NotificationSentMessages/></main>;
}
