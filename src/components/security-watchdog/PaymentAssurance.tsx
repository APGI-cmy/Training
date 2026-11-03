'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {AssuranceSnapshot} from '@/lib/security-assurance';
export function PaymentAssurance({scope}:{scope?:string}){
 const [report,setReport]=useState<AssuranceSnapshot|null>(null);
 useEffect(()=>{const controller=new AbortController();setReport(null);fetch('/api/security-assurance'+(scope?'?scope='+encodeURIComponent(scope):''),{cache:'no-store',credentials:'same-origin',signal:controller.signal}).then(async r=>{if(r.ok)setReport(await r.json());}).catch(()=>{});return()=>controller.abort();},[scope]);
 return <section className="admin-form-card" aria-label="Payment information protection"><h2>Before entering payment details</h2>
 <p><strong>Enter card or bank account details only in Stripe’s hosted payment or onboarding form.</strong> Do not upload them as files or send them through platform messages. Check the destination address before continuing.</p>
 <p>V2 is a sandbox. Live payment and bank onboarding acceptance has not been completed.</p>
 {report?.current?<progress value={report.payment.passed} max={report.payment.total} aria-label="Named payment protection checks passed"/>:null}
 {report?<p>{report.current?`${report.payment.passed} of ${report.payment.total} named payment protection checks passed`:'Current payment protection evidence is unavailable'}{report.checkedAt?` · Last completed ${new Date(report.checkedAt).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST`:''}. <Link href="/security-assurance">View payment protection and its limits</Link></p>:<p><Link href="/security-assurance">View payment protection and its limits</Link></p>}
 <p>Use the dated results to see which controls were tested. A passing result is not a guarantee against fraud or disclosure.</p></section>;
}
