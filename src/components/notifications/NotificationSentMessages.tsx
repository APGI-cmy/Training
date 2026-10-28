'use client';
import {useEffect,useState,useTransition} from 'react';
import {remindNotification} from '@/server/actions/notifications';
import {notificationReference,notificationStatus,type PersonalNotification} from '@/lib/notifications';
import './notification-sent.css';
const date=(at:string)=>new Date(at).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})+' SAST';
function Reminder({item}:{item:PersonalNotification}){
 const [pending,start]=useTransition(),[message,setMessage]=useState(''),[error,setError]=useState(false);
 return <><button type="button" className="secondary-button" disabled={pending||!item.can_remind} onClick={()=>start(async()=>{
  try{const result=await remindNotification(item.id);setMessage(result.error??result.success??'');setError(!!result.error);if(result.success)window.dispatchEvent(new Event('apgi-notifications-changed'));}
  catch{setMessage('The reminder could not be sent. Try again.');setError(true);}
 })}>{pending?'Sending…':'Send platform reminder'}</button>{message?<p role={error?'alert':'status'}>{message}</p>:null}{!item.read_at&&!item.can_remind?<small>Available after 24 hours if the message is still unread and outstanding.</small>:null}</>;
}
export function NotificationSentMessages({roundId,unit}:{roundId?:string;unit?:string}){
 const [page,setPage]=useState(0),[data,setData]=useState<{items:PersonalNotification[];total:number}|null>(null),[error,setError]=useState('');
 useEffect(()=>setPage(0),[roundId,unit]);
 useEffect(()=>{
  let stopped=false;let controller:AbortController|undefined;setData(null);setError('');
  async function refresh(){controller?.abort();controller=new AbortController();const q=new URLSearchParams({page:String(page)});if(roundId)q.set('round',roundId);if(unit)q.set('unit',unit);
   try{const r=await fetch(`/api/notifications/sent?${q}`,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();const result=await r.json();if(!stopped){setData(result);setError('');}}
   catch{if(!stopped&&!controller?.signal.aborted)setError('Your sent messages could not be loaded. Refresh to try again.');}
  }
  void refresh();window.addEventListener('apgi-notifications-changed',refresh);window.addEventListener('focus',refresh);
  return()=>{stopped=true;controller?.abort();window.removeEventListener('apgi-notifications-changed',refresh);window.removeEventListener('focus',refresh);};
 },[roundId,unit,page]);
 return <section className="notification-sent" aria-label="Messages sent by you"><h3>Messages you sent{unit?' about this LU':''}</h3><p>Each recipient has a separate platform inbox receipt. These rows track other people’s reading; they have no Read receipt button. Email delivery is tracked separately.</p>
 {error?<p role="alert">{error}</p>:!data?<p role="status">Loading your sent messages…</p>:<details><summary>Sent-message tracking ({data.total})</summary>{data.items.length?<div className="lu-table-wrap notification-table-scroll"><table><thead><tr><th>Recipient / message</th><th>Platform inbox</th><th>Read receipt</th><th>Response / reminder</th></tr></thead><tbody>{data.items.map(n=><tr key={n.id}><td><strong>{n.recipient_email}</strong><p>{notificationReference(n)} · {n.message}</p><details><summary>View message</summary><p className="notification-requirement">{n.requirement}</p></details></td><td>Delivered<br/>{date(n.created_at)}{n.reminder_count?<p>{n.reminder_count} reminder(s)<br/>{n.last_reminded_at?date(n.last_reminded_at):null}</p>:null}</td><td>{n.read_at?`Read ${date(n.read_at)}`:'Not read'}</td><td><p>Recipient response: {notificationStatus(n)}</p>{n.source_type==='review'&&!n.read_at?<Reminder item={n}/>:null}</td></tr>)}</tbody></table></div>:<p>No sent messages in this view yet.</p>}
 <nav aria-label="Sent-message pages">{page>0?<button type="button" onClick={()=>setPage(p=>p-1)}>Newer messages</button>:null}{(page+1)*50<data.total?<button type="button" onClick={()=>setPage(p=>p+1)}>Older messages</button>:null}</nav></details>}</section>;
}
