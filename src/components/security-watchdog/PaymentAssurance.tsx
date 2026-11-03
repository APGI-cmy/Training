'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import type {AssuranceSnapshot} from '@/lib/security-assurance';
import type {PaymentVerification} from '@/lib/payment-verification';
export function PaymentAssurance({scope}:{scope?:string}){
 const [report,setReport]=useState<AssuranceSnapshot|null>(null);
 const [fresh,setFresh]=useState<PaymentVerification|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const verification=useRef<AbortController|null>(null);
 useEffect(()=>{setFresh(null);setError('');setBusy(false);return()=>verification.current?.abort();},[scope]);
 async function verify(){
  const controller=new AbortController();verification.current=controller;
  setBusy(true);setError('');setFresh(null);
  try{
   const response=await fetch('/api/security-assurance/payment-check',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify(scope?{scope}:{})});
   const value=await response.json();if(!response.ok)throw Error(value.error??'Payment verification could not be completed.');if(!controller.signal.aborted)setFresh(value);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Payment verification could not be completed.');}finally{if(!controller.signal.aborted)setBusy(false);}
 }
 useEffect(()=>{const controller=new AbortController();setReport(null);fetch('/api/security-assurance'+(scope?'?scope='+encodeURIComponent(scope):''),{cache:'no-store',credentials:'same-origin',signal:controller.signal}).then(async r=>{if(r.ok)setReport(await r.json());}).catch(()=>{});return()=>controller.abort();},[scope]);
 return <section className="admin-form-card" aria-label="Payment information protection"><h2>Before entering payment details</h2>
 <p><strong>Enter card or bank account details only in Stripe’s hosted payment or onboarding form.</strong> Do not upload them as files or send them through platform messages. Check the destination address before continuing.</p>
 <p>V2 is a sandbox. Live payment and bank onboarding acceptance has not been completed.</p>
 {report?.current?<progress value={report.payment.passed} max={report.payment.total} aria-label="Named payment protection checks passed"/>:null}
 {report?<p>{report.current?`${report.payment.passed} of ${report.payment.total} named payment protection checks passed`:'Current payment protection evidence is unavailable'}{report.checkedAt?` · Last completed ${new Date(report.checkedAt).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST`:''}. <Link href="/security-assurance">View payment protection and its limits</Link></p>:<p><Link href="/security-assurance">View payment protection and its limits</Link></p>}
 <button type="button" className="primary-button" disabled={busy} onClick={verify}>{busy?'Running payment protection checks…':'Run a fresh payment portal security check'}</button>
 <p>This runs five payment-control checks with fictional data. It does not create a payment, open a bank account or repeat the broader account-isolation tests above.</p>
 {error?<p role="alert">{error}</p>:null}
 <div role="status" aria-live="polite" aria-busy={busy}>{fresh?<><p><strong>{fresh.passed} of {fresh.total} fresh payment-control checks passed</strong> · {new Date(fresh.checkedAt).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST</p><progress value={fresh.passed} max={fresh.total} aria-label="Fresh payment-control checks passed"/><ul>{fresh.checks.map(c=><li key={c.title}>{c.state==='passed'?'✓ Passed':c.state==='failed'?'✕ Failed':'Needs investigation'} — {c.title}</li>)}</ul><p>Live payment and bank onboarding: not tested. A successful security check does not resolve country availability or complete Stripe setup.</p></>:null}</div>
 <p>Use the dated results to see which controls were tested. A passing result is not a guarantee against fraud or disclosure.</p></section>;
}
