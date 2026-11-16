import {NotificationInboxRefresh} from '@/components/notifications/NotificationInboxRefresh';
import Link from "next/link";
import {notificationSession,notificationInbox,notificationDestination} from "@/server/services/notifications";
import {notificationStatus,notificationReference,notificationView,notificationInInbox} from "@/lib/notifications";
import {NotificationControls} from "@/components/notifications/NotificationControls";
import {NotificationSentMessages} from "@/components/notifications/NotificationSentMessages";
import {NotificationAddress} from "@/components/notifications/NotificationAddress";
import "./notifications.css";
export const dynamic="force-dynamic";
const date=(at:string)=>new Date(at).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"});
export default async function NotificationsPage({searchParams}:{searchParams:Promise<{view?:string;page?:string;notification?:string}>}){
 const session=await notificationSession(),query=await searchParams,filter=notificationView(query.view),page=Math.min(200,Math.max(0,Number.parseInt(query.page??"0",10)||0));
 const inbox={...await notificationInbox(session,filter,page*50)};
 let selectedError='';
 if(query.notification&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.notification)){
  try{const selected=await notificationDestination(session,query.notification);inbox.items=[selected,...inbox.items.filter(n=>n.id!==selected.id)];}
  catch{selectedError='This notification is unavailable to your account.';}
 }
 return <main className="notification-page"><NotificationInboxRefresh/><h1>Notifications</h1><p>Your inbox contains unread updates and requests that still need your response. Read updates and completed requests move to History automatically; their messages, decisions and read receipts remain saved.</p><p>Opening a request records reading, but it stays in your inbox until its required action is completed. If a request reopens or a new version needs your decision, it appears here again.</p>
 <p className="notification-totals"><strong>{inbox.unread} unread</strong><strong>{inbox.responses} need a response</strong></p>
 <nav className="notification-filters" aria-label="Notification filters">{[["inbox","Inbox"],["unread","Unread"],["response","Needs a response"],["history","History"]].map(([view,label])=><Link key={view} href={`/notifications?view=${view}`} aria-current={filter===view?"page":undefined}>{label}</Link>)}</nav>
 {filter==='history'?<p>Archived updates and completed requests. Nothing is deleted, and an unread completed request is not falsely marked as read.</p>:filter==='all'?<p>All retained records, including active requests and archived history. <Link href="/notifications">Return to inbox</Link>.</p>:null}
 {selectedError?<p role="status">{selectedError}</p>:null}
 {inbox.items.some(n=>n.target_path==="/notifications#archived-company-request")?<aside id="archived-company-request" className="notification-card"><h2>Archived company requests</h2><p>These updates concern companies that are inactive or no longer available. Their history is retained and no response is required.</p></aside>:null}
 {inbox.unread>0&&filter!=='history'&&filter!=='all'?<NotificationControls all/>:null}
 {inbox.items.length?inbox.items.map(n=><article id={`notification-${n.id}`} className="notification-card" data-unread={!n.read_at} key={n.id}><p className="notification-reference-label"><strong>{notificationReference(n)}</strong></p>{!notificationInInbox(n)?<p className="notification-archive-label">Archived automatically — {n.archived?'no further response required':n.response_type==='read'?'update read':'response completed or no longer required'}</p>:null}<NotificationAddress recipient={session.user.email} sender={n.sender_email}/><h2>{n.message}</h2><p className="notification-requirement">{n.requirement}</p><p>{date(n.created_at)} SAST · <strong>{notificationStatus(n)}</strong>{n.read_at&&n.pending?" · Read":""}</p>{n.read_at?<p>Read: {date(n.read_at)} SAST{n.acknowledged_at?` · Acknowledged: ${date(n.acknowledged_at)} SAST`:""}</p>:null}{n.resolved_at?<p>No longer outstanding when checked: {date(n.resolved_at)} SAST. The read and response history is retained.</p>:null}<NotificationControls item={n}/></article>):<p role="status">{filter==='inbox'?'Your inbox is clear. There are no unread updates or outstanding requests.':filter==='history'?'No archived notifications yet.':'No notifications in this view.'}</p>}
 <nav className="notification-filters" aria-label="Notification pages">{page>0?<Link href={`/notifications?view=${filter}&page=${page-1}`}>Newer updates</Link>:null}{(page+1)*50<inbox.total?<Link href={`/notifications?view=${filter}&page=${page+1}`}>Older updates</Link>:null}</nav>
 <NotificationSentMessages/></main>;
}

