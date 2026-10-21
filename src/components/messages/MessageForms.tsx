"use client";
import {useActionState,useEffect,useId,useState} from "react";
import {useRouter} from "next/navigation";
import {messageAction} from "@/server/actions/messages";
import {messageExamples,type MessageScope,type MessageContact,type MessageTemplate,type MessageState} from "@/lib/messages";
function useMessageForm(){const [state,action,pending]=useActionState<MessageState,FormData>(messageAction,{});const router=useRouter();useEffect(()=>{if(state.success){window.dispatchEvent(new Event('apgi-notifications-changed'));router.refresh();}},[state,router]);return {state,action,pending};}
function Result({state}:{state:MessageState}){return <>{state.error?<p role="alert" className="message-error">{state.error}</p>:null}{state.success?<p role="status" className="message-success">{state.success}</p>:null}</>;}
export function MessageComposer({scopes=[],contacts=[],threadId,admin=false}:{scopes?:MessageScope[];contacts?:MessageContact[];threadId?:string;admin?:boolean}){
 const {state,action,pending}=useMessageForm(),router=useRouter();const [id,setId]=useState('');
 useEffect(()=>{if(!state.error)setId(crypto.randomUUID());},[state]);
 useEffect(()=>{if(state.threadId&&!threadId)router.push(`/messages/${state.threadId}`);},[state,router,threadId]);
 return <form action={action} className="message-form"><input type="hidden" name="operation" value="send"/><input type="hidden" name="message_id" value={id}/>{threadId?<input type="hidden" name="thread_id" value={threadId}/>:<>
 <label>Company / first-level support<select name="organisation_id" required defaultValue={scopes.find(s=>s.name!=='APGI')?.id??scopes[0]?.id}>{scopes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 {admin?<label>Send to<select name="to" defaultValue=""><option value="">Company administrator / APGI support</option>{contacts.map(c=><option key={c.email} value={c.email}>{c.label}</option>)}</select><small>Direct recipients must belong to the selected company or be an APGI principal.</small></label>:null}
 <label>Subject<input name="subject" required maxLength={200}/></label></>}
 <label>{threadId?'Reply':'Message'}<textarea name="body" required maxLength={20000} rows={8}/></label>
 <label>Attachment (optional)<input name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt"/><small>One PDF, PNG, JPG or text file, up to 2 MB. Attachments are opened securely in the conversation.</small></label>
 <button disabled={pending||!id}>{pending?'Saving…':threadId?'Send reply':'Send message'}</button><Result state={state}/></form>;
}
export function MessageManage({id,operation,label}:{id:string;operation:string;label:string}){const {state,action,pending}=useMessageForm();return <form action={action}><input type="hidden" name="operation" value={operation}/><input type="hidden" name={operation==='toggle'?'id':'thread_id'} value={id}/><button disabled={pending}>{label}</button><Result state={state}/></form>;}
export function TemplateEditor({templates}:{templates:MessageTemplate[]}){
 const {state,action,pending}=useMessageForm(),[selected,setSelected]=useState('');const example=messageExamples.find(t=>t.name===selected),saved=templates.find(t=>t.id===selected),template=saved??example;
 return <><label>Start from a saved message or example<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">New blank message</option><optgroup label="Your saved messages">{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</optgroup><optgroup label="Examples">{messageExamples.map(t=><option key={t.name}>{t.name}</option>)}</optgroup></select></label>
 <form action={action} key={selected} className="message-form"><input type="hidden" name="operation" value="template"/><input type="hidden" name="id" value={saved?.id??''}/><label>Template name<input name="name" required maxLength={100} defaultValue={template?.name}/></label><label>Subject<input name="subject" required maxLength={200} defaultValue={template?.subject}/></label><label>Message<textarea name="body" required rows={8} maxLength={20000} defaultValue={template?.body}/></label><button disabled={pending}>{saved?'Update my template':'Save as my template'}</button><Result state={state}/></form></>;
}
export function ScheduleComposer({templates,scopes,contacts}:{templates:MessageTemplate[];scopes:MessageScope[];contacts:MessageContact[]}){
 const {state,action,pending}=useMessageForm(),[chosen,setChosen]=useState(''),[cadence,setCadence]=useState('once'),[recipients,setRecipients]=useState(''),id=useId();const template=templates.find(t=>t.id===chosen);
 return <><label>Use a saved message<select value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Write a new message</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
 <form action={action} className="message-form"><input type="hidden" name="operation" value="schedule"/><label>Company<select name="organisation_id" required>{scopes.filter(s=>s.admin).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label>Add a recipient<select value="" onChange={e=>setRecipients(previous=>[...new Set([...previous.split(/[;,\n]/).map(x=>x.trim()).filter(Boolean),e.target.value])].join('\n'))}><option value="" disabled>Choose a recipient</option>{contacts.map(c=><option key={c.email}>{c.email}</option>)}</select></label>
 <label>Recipient email addresses<textarea name="recipients" value={recipients} onChange={e=>setRecipients(e.target.value)} rows={4} required placeholder="One email address per line"/><small>Up to 200 recipients in the selected company, or APGI principals. Each receives a separate private conversation.</small></label>
 <div key={chosen}><label>Subject<input name="subject" defaultValue={template?.subject} required maxLength={200}/></label><label>Message<textarea name="body" defaultValue={template?.body} rows={8} required maxLength={20000}/></label></div>
 <label>Frequency<select name="cadence" value={cadence} onChange={e=>setCadence(e.target.value)}><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
 <label>First send — South African time (SAST)<input name="start" type="datetime-local" required={cadence!=='once'} aria-describedby={id}/></label><small id={id}>Leave blank for a one-off message at the next dispatch. Dispatch runs every 10 minutes. Repeating messages use the selected start time; a missed dispatch does not send a backlog.</small>
 <label>Stop date and time — SAST<input name="end" type="datetime-local" required={cadence!=='once'}/><small>Required for repeating messages; maximum one year from the start.</small></label>
 <p>The saved schedule keeps this exact message and recipient list. Editing a template does not change scheduled messages. These are scheduled sends; enrolment and deadline triggers will be configured separately in V3.</p>
 <button disabled={pending}>{pending?'Saving…':'Confirm recipients and schedule'}</button><Result state={state}/></form></>;
}
