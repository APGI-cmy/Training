'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import type {AssuranceSnapshot} from '@/lib/security-assurance';
import './assurance.css';
export function SecurityAssuranceNotice(){
 const [notice,setNotice]=useState<{text:string;href:string}|null>(null),previous=useRef<AssuranceSnapshot|null>(null);
 useEffect(()=>{
  let stopped=false,busy=false,timer:ReturnType<typeof setTimeout>|undefined;const controller=new AbortController();
  const show=(text:string,href:string)=>{if(timer)clearTimeout(timer);setNotice({text,href});timer=setTimeout(()=>setNotice(null),9000);};
  const poll=async()=>{
   if(document.visibilityState==='hidden'||busy)return;busy=true;
   try{const r=await fetch('/api/security-assurance',{cache:'no-store',credentials:'same-origin',signal:controller.signal});if(!r.ok){previous.current=null;setNotice(null);return;}
    const current=await r.json() as AssuranceSnapshot;if(stopped)return;const old=previous.current;
    if(!old||old.context!==current.context){
     try{const key='apgi-security-notice:'+current.context;if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'shown');show(current.automatic?'Daily platform protection checks are enabled. View what is checked and what remains untested.':'View the latest platform protection checks and their limits.',current.reportHref);}}catch{/* Storage restrictions must not interrupt learning. */}
    }else if(current.event&&current.event!==old.event&&current.phase==='running')show('Platform security tests started.',current.reportHref);
    else if(current.phase==='finished'&&(old.phase==='running'||current.event!==old.event))show(current.current?(current.overall?`Platform checks completed: ${current.overall.percent}% of named checks passed. View results.`:`Platform checks completed. ${current.payment.passed}/${current.payment.total} named payment protection checks passed. View results.`):'Security checks ended. Current verified evidence is unavailable; view the report.',current.reportHref);
    previous.current=current;
   }catch{/* No success message is inferred from a failed request. */}finally{busy=false;}
  };
  void poll();const interval=setInterval(()=>void poll(),20000);document.addEventListener('visibilitychange',poll);
  return()=>{stopped=true;controller.abort();clearInterval(interval);if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',poll);};
 },[]);
 if(!notice)return null;
 return <aside className="security-assurance-notice" aria-live="polite" aria-atomic="true"><Link href={notice.href}>{notice.text}</Link><button type="button" onClick={()=>setNotice(null)} aria-label="Dismiss security update">×</button></aside>;
}
