"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import type {NotificationCounts} from "@/lib/notifications";
export function SidebarNotifications({initial}:{initial:NotificationCounts|null}){
 const [counts,setCounts]=useState(initial),pathname=usePathname();
 useEffect(()=>setCounts(initial),[initial]);
 useEffect(()=>{
  let busy=false,stopped=false,controller:AbortController|undefined;
  async function refresh(){
   if(busy||stopped||document.visibilityState!=="visible")return;
   busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),15000);
   try{const response=await fetch("/api/notifications",{cache:"no-store",signal:controller.signal});
    if(!stopped){if(response.status===401||response.status===403){stopped=true;setCounts(null);}else if(response.ok)setCounts(await response.json());else setCounts(null);}
   }catch{if(!stopped)setCounts(null);}finally{clearTimeout(timeout);busy=false;}
  }
  const timer=setInterval(()=>void refresh(),30000),update=()=>void refresh();
  window.addEventListener("focus",update);window.addEventListener("apgi-notifications-changed",update);document.addEventListener("visibilitychange",update);
  return ()=>{stopped=true;clearInterval(timer);controller?.abort();window.removeEventListener("focus",update);window.removeEventListener("apgi-notifications-changed",update);document.removeEventListener("visibilitychange",update);};
 },[]);
 const label=counts?`Notifications: ${counts.unread} unread, ${counts.responses} requiring a response`:"Notifications: unable to check for updates";
 return <Link className="sidebar-notification-prompt" href="/notifications" aria-current={pathname==="/notifications"?"page":undefined} aria-label={label}>
 <span className="notification-prompt-title"><svg aria-hidden="true" width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><strong>Notifications</strong>{counts&&counts.attention>0?<span className="notification-badge">{counts.attention>99?"99+":counts.attention}</span>:null}</span>
 <small aria-live="polite">{counts?`${counts.unread} unread${counts.responses?` · ${counts.responses} need a response`:""}`:"Unable to check updates"}</small></Link>;
}
