import Link from "next/link";
import {notFound} from "next/navigation";
import {messageDetail} from "@/server/services/messages";
import {MessageComposer,MessageManage} from "@/components/messages/MessageForms";
import {messageDate} from "@/lib/messages";
import {validId} from "@/lib/company-structure";
export const dynamic='force-dynamic';
export default async function ConversationPage({params}:{params:Promise<{id:string}>}){
 const id=validId((await params).id);let context;
 try{context=await messageDetail(id);}catch(error){if(error instanceof Error&&'digest' in error)throw error;notFound();}
 const {detail,session}=context,t=detail.thread;
 return <main><nav><Link href="/messages">Back to messages and support</Link><Link href="/notifications">Notifications</Link></nav><h1>{t.subject}</h1><p>{t.status==='closed'?'Closed':'Open'} · {t.level==='apgi'?'APGI support':t.level==='company'?'Company support':'Direct message'}</p>
 {detail.messages.map(m=><article key={m.id}><p className="message-meta"><strong>{m.sender_email}</strong> · {messageDate(m.created_at)} SAST</p><p className="message-body">{m.body}</p>{m.attachment_name?<p><a className="message-link" href={`/api/messages/attachments/${m.id}`}>Download {m.attachment_name}</a></p>:null}
 {m.sender_email===session.user.email?.toLowerCase()?<ul className="message-receipts">{m.receipts.map(r=><li key={r.email}>{r.email} · {r.read_at?`Read in platform ${messageDate(r.read_at)} SAST`:'Not yet read in platform'} · {r.state==='accepted'?'Email accepted by provider':r.state==='expired'?'Email retry period expired':r.state==='failed'?'Email retry pending':'Email queued'}</li>)}</ul>:null}</article>)}
 <div className="message-actions">{detail.canManage&&t.level==='company'?<MessageManage id={id} operation="escalate" label="Escalate to APGI"/>:null}{detail.canManage||session.user.id===t.created_by?<MessageManage id={id} operation={t.status==='closed'?'reopen':'close'} label={t.status==='closed'?'Reopen conversation':'Close conversation'}/>:null}</div>
 {t.status==='open'?<section><h2>Reply</h2><MessageComposer threadId={id}/><p>Replies are saved here and email notifications are sent to the other conversation participants.</p></section>:null}</main>;
}
