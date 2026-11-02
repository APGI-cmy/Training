'use client';
import {useState,useRef,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {manualControls} from '@/lib/security-watchdog';
async function post(body:unknown){const r=await fetch('/api/security-watchdog',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Error(result.error??'The request could not be completed.');return result;}
export function RunWatchdog({scope,actorId}:{scope:string|null;actorId:string}){
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const request=useRef<string|null>(null),router=useRouter();
 async function run(){
  if(busy||!consent)return;setBusy(true);setMessage('Checking live controls and synthetic access boundaries. This can take up to two minutes.');
  const storageKey=`apgi-watchdog-request:${actorId}:${scope??'platform'}`;
  try{
   try{request.current??=sessionStorage.getItem(storageKey);}catch{/* In-memory idempotency remains available. */}
   request.current??=crypto.randomUUID();try{sessionStorage.setItem(storageKey,request.current);}catch{}
   const result=await post({operation:'run',scope,requestId:request.current,consent});
   try{sessionStorage.removeItem(storageKey);}catch{}request.current=null;
   router.push(`/security-watchdog?scope=${scope??'platform'}&run=${result.runId}`);router.refresh();setMessage('Test finished. Review the passed checks, findings and untested areas below.');
  }catch(e){setMessage(e instanceof Error?e.message:'The run could not finish. Check the saved run history before retrying.');router.refresh();}
  finally{setBusy(false);}
 }
 return <section className="watchdog-box"><h2>Run a controlled security check</h2><p>The drill creates three temporary fictional accounts and two synthetic companies inside V2 staging. It tests existing profile and membership rules, the deployed company guard, Watchdog scopes and canary isolation. It then removes its fixtures. Customer content is not copied into the drill.</p><label className="watchdog-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/> I understand this is a bounded synthetic test and a point-in-time report, with untested areas listed.</label><button className="primary-button" type="button" disabled={!consent||busy} onClick={()=>void run()}>{busy?'Security check running…':'Run security check'}</button><p role="status" aria-live="polite">{message}</p><p className="watchdog-small">One test runs at a time. Allow 90 seconds between your tests. If you leave this page, check the run history when you return.</p></section>;
}
export function WatchdogReceipt({id,readAt}:{id:string;readAt:string|null}){
 const [read,setRead]=useState(readAt),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function acknowledge(){setBusy(true);try{await post({operation:'acknowledge',deliveryId:id});setRead(new Date().toISOString());}catch(e){setError(e instanceof Error?e.message:'Read receipt could not be saved.');}finally{setBusy(false);}}
 return <div>{read?<strong>Read receipt recorded for your account</strong>:<button type="button" className="secondary-button" disabled={busy} onClick={()=>void acknowledge()}>{busy?'Recording…':'Record my read receipt'}</button>}{error?<p role="alert">{error}</p>:null}</div>;
}
export function WatchdogEvidenceForm({scope}:{scope:string|null}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),router=useRouter();
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,data=new FormData(form);setBusy(true);try{await post({operation:'evidence',scope,controlId:data.get('control'),disposition:data.get('disposition'),reference:data.get('reference'),expires:data.get('expires')});setMessage('Evidence reference saved as an administrator statement. It does not mark technical tests passed or certify ISO compliance.');form.reset();router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'Evidence could not be saved.');}finally{setBusy(false);}}
 return <form onSubmit={e=>void save(e)} className="watchdog-evidence-form"><label>Control<select name="control" required>{manualControls.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>Record type<select name="disposition"><option value="recorded">Evidence reference recorded</option><option value="gap">Gap / action required</option><option value="not_applicable">Proposed not applicable — explain why</option></select></label><label>Evidence reference / explanation<textarea name="reference" minLength={5} maxLength={1500} required placeholder="Document title, version, exercise or reviewed decision. Keep sensitive records in approved storage."/></label><label>Review again by<input name="expires" type="date" required min={new Date(Date.now()+86400000).toISOString().slice(0,10)}/></label><button className="secondary-button" disabled={busy}>{busy?'Saving…':'Save evidence reference'}</button><p role="status">{message}</p></form>;
}
