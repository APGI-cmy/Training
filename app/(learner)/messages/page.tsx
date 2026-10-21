import Link from "next/link";
import {messageWorkspace} from "@/server/services/messages";
import {MessageComposer} from "@/components/messages/MessageForms";
import {messageDate} from "@/lib/messages";
export const dynamic='force-dynamic';
export default async function MessagesPage(){const {workspace}=await messageWorkspace();return <main><h1>Messages and support</h1><p>Send your company administrator a message, add an attachment and follow the replies here. Your administrator can escalate a request to APGI. If no company administrator is available, it goes to APGI directly.</p><nav><Link href="/notifications">Notifications and receipts</Link>{workspace.admin?<Link href="/messages/admin">Message templates and scheduled sends</Link>:null}</nav>
 <details><summary>Write a message</summary><MessageComposer scopes={workspace.scopes} contacts={workspace.contacts} admin={workspace.admin}/></details>
 <section><h2>Your conversations</h2>{workspace.threads.length?<ul className="message-thread-list">{workspace.threads.map(t=><li key={t.id}><Link href={`/messages/${t.id}`}>{t.subject}</Link>{t.unread>0?<strong> · {t.unread} unread</strong>:null}<p>{t.status==='closed'?'Closed':'Open'} · {t.level==='apgi'?'APGI support':t.level==='company'?'Company support':'Direct message'} · {messageDate(t.updated_at)} SAST</p></li>)}</ul>:<p>No messages yet. Choose “Write a message” to start.</p>}</section></main>;}
