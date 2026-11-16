import Link from "next/link";
import {notFound} from "next/navigation";
import {messageWorkspace} from "@/server/services/messages";
import {TemplateEditor,ScheduleComposer,MessageManage} from "@/components/messages/MessageForms";
import {messageDate} from "@/lib/messages";
export const dynamic='force-dynamic';
export default async function MessageAdmin(){const {workspace}=await messageWorkspace();if(!workspace.admin)notFound();return <main><nav><Link href="/messages">Messages and support</Link></nav><h1>Message templates and scheduled sends</h1><p>Create your own standard messages and schedule one-off or repeating sends to people in your administrative scope. Each recipient receives a private conversation and email notification.</p>
 <details><summary>Create or edit a standard message</summary><TemplateEditor templates={workspace.templates}/></details>
 <details><summary>Send once or create a repeating message</summary><ScheduleComposer scopes={workspace.scopes} contacts={workspace.contacts} templates={workspace.templates}/></details>
 <section><h2>Your scheduled messages</h2>{workspace.schedules.length?workspace.schedules.map(s=><article key={s.id}><h3>{s.subject}</h3><p>{s.cadence} · {s.state} · {s.sent_count} dispatch{s.sent_count===1?'':'es'} completed</p><p>Next / last scheduled time: {messageDate(s.next_at)} SAST{s.end_at?` · Stops ${messageDate(s.end_at)} SAST`:''}</p><details><summary>{s.recipients.length} recipient{s.recipients.length===1?'':'s'}</summary><p>{s.recipients.join(', ')}</p></details>{s.last_error?<p role="alert">{s.last_error}</p>:null}{s.state!=='complete'?<MessageManage id={s.id} operation="toggle" label={s.state==='active'?'Pause schedule':'Resume schedule'}/>:null}</article>):<p>No scheduled messages. No repeating messages are sent until you create and confirm a schedule.</p>}</section></main>;}
