import Link from "next/link";
import {notificationSession,notificationInbox} from "@/server/services/notifications";
import {notificationStatus} from "@/lib/notifications";
import {NotificationControls} from "@/components/notifications/NotificationControls";
import "./notifications.css";
export const dynamic="force-dynamic";
const date=(at:string)=>new Date(at).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"});
export default async function NotificationsPage({searchParams}:{searchParams:Promise<{view?:string;page?:string}>}){
 const session=await notificationSession(),query=await searchParams,filter=["unread","response"].includes(query.view??"")?query.view!:"all",page=Math.min(200,Math.max(0,Number.parseInt(query.page??"0",10)||0));
 const inbox=await notificationInbox(session,filter,page*50);
 return <main className="notification-page"><h1>Notifications</h1><p>Updates and requests for your attention. Opening an update records a read receipt. Acknowledging receipt does not approve content, branding, prices or agreements; complete those decisions in their workflow.</p>
 <p className="notification-totals"><strong>{inbox.unread} unread</strong><strong>{inbox.responses} need a response</strong></p>
 <nav className="notification-filters" aria-label="Notification filters">{[["all","All updates"],["unread","Unread"],["response","Needs a response"]].map(([view,label])=><Link key={view} href={`/notifications?view=${view}`} aria-current={filter===view?"page":undefined}>{label}</Link>)}</nav>
 {inbox.unread>0?<NotificationControls all/>:null}
 {inbox.items.length?inbox.items.map(n=><article className="notification-card" data-unread={!n.read_at} key={n.id}><h2>{n.message}</h2><p>{date(n.created_at)} SAST · <strong>{notificationStatus(n)}</strong>{n.read_at&&n.pending?" · Read":""}</p>{n.read_at?<p>Read: {date(n.read_at)} SAST{n.acknowledged_at?` · Acknowledged: ${date(n.acknowledged_at)} SAST`:""}</p>:null}<NotificationControls item={n}/></article>):<p>No notifications in this view.</p>}
 <nav className="notification-filters" aria-label="Notification pages">{page>0?<Link href={`/notifications?view=${filter}&page=${page-1}`}>Newer updates</Link>:null}{(page+1)*50<inbox.total?<Link href={`/notifications?view=${filter}&page=${page+1}`}>Older updates</Link>:null}</nav>
 <details className="notification-receipts"><summary>Recent receipts for your updates</summary><p>These receipts show delivery to the platform inbox, reading and acknowledgement. Email delivery is tracked separately. Required decisions are confirmed by their saved workflow outcome.</p>{inbox.receipts.length?<div className="notification-table-scroll"><table><thead><tr><th>Recipient and update</th><th>Platform inbox</th><th>Read / acknowledgement</th><th>Response</th></tr></thead><tbody>{inbox.receipts.map(n=><tr key={n.id}><td>{n.recipient_email}<p>{n.message}</p></td><td>Delivered<br/>{date(n.created_at)} SAST</td><td>{n.read_at?`Read ${date(n.read_at)} SAST`:"Not read"}{n.acknowledged_at?<p>Acknowledged {date(n.acknowledged_at)} SAST</p>:null}</td><td>{notificationStatus(n)}</td></tr>)}</tbody></table></div>:<p>No receipts for your updates yet.</p>}</details></main>;
}
