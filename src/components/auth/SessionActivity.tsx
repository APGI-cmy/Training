"use client";

import { useEffect, useState } from "react";

import { IDLE_TIMEOUT_MS } from "@/lib/session-activity";

export function SessionActivity() {

  const [warning,setWarning] = useState("");

  useEffect(()=>{

    let lastActivity=Date.now(), lastSent=0, authenticated=false, busy=false, stopped=false;

    const documents = new Map<Document,()=>void>();

    const channel = typeof BroadcastChannel!=="undefined" ? new BroadcastChannel("apgi-session-activity") : null;

    function activity(event?:Event) { if(event && !event.isTrusted)return; lastActivity=Date.now();setWarning("");channel?.postMessage(lastActivity); }

    channel?.addEventListener("message",event=>{if(typeof event.data==="number" && event.data<=Date.now()+1000)lastActivity=Math.max(lastActivity,event.data);});

    function attach(doc:Document) {

      if(!documents.has(doc)){const events=["pointerdown","pointermove","keydown","input","scroll","touchstart"];for(const type of events)doc.addEventListener(type,activity,{passive:true});documents.set(doc,()=>events.forEach(type=>doc.removeEventListener(type,activity)));}

      for(const frame of doc.querySelectorAll("iframe")){try{if(frame.contentDocument)attach(frame.contentDocument);}catch{/* Cross-origin content cannot be inspected. */}}

      if(document.visibilityState==="visible" && [...doc.querySelectorAll<HTMLMediaElement>("video,audio")].some(media=>!media.paused&&!media.ended&&media.readyState>=2))activity();

    }

    async function pulse(initial=false) {

      if(busy||stopped)return;

      for(const [doc,remove] of documents)if(doc!==document&&!doc.defaultView?.frameElement?.isConnected){remove();documents.delete(doc);}
      attach(document);

      const idle=Date.now()-lastActivity;

      if(authenticated&&idle>IDLE_TIMEOUT_MS-120000)setWarning("You will be signed out after 30 minutes without activity. Continue working to stay signed in.");

      if(!initial && idle<IDLE_TIMEOUT_MS && (lastActivity<=lastSent||Date.now()-lastSent<60000))return;

      busy=true;

      try {

        const response=await fetch("/api/auth/activity",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({active:idle<IDLE_TIMEOUT_MS}),cache:"no-store"});

        if(response.status===401){lastSent=Date.now();if(authenticated){stopped=true;window.location.assign(`/alp-sign-in?next=${encodeURIComponent(location.pathname+location.search+location.hash)}`);}return;}

        if(response.ok){const result=await response.json();authenticated=result.authenticated;lastSent=Date.now();}

      }catch{/* Offline work remains visible; retry when connected. */}finally{busy=false;}

    }

    void pulse(true);const timer=setInterval(()=>void pulse(),10000);

    return ()=>{stopped=true;clearInterval(timer);documents.forEach(remove=>remove());documents.clear();channel?.close();};

  },[]);

  return warning?<div role="status" style={{position:"fixed",bottom:12,left:12,zIndex:10000,background:"#ffe8a3",color:"#172b46",padding:12,maxWidth:460}}>{warning}</div>:null;

}

