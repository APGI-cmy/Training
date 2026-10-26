"use client";
import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname,useSearchParams} from "next/navigation";
import Link from "next/link";
import {notificationReference,notificationTarget,type PersonalNotification} from "@/lib/notifications";
import "./notification-markers.css";
type Marker={notice:PersonalNotification;mount:HTMLElement};
export function NotificationTargetMarkers(){
 const pathname=usePathname(),selected=useSearchParams().get("notification"),[notices,setNotices]=useState<PersonalNotification[]>([]),[markers,setMarkers]=useState<Marker[]>([]);
 const revealed=useRef<string|null>(null);
 useEffect(()=>{
  if(notificationTarget(pathname)!==pathname||pathname==="/notifications"){setNotices([]);return;}
  let stopped=false;let controller:AbortController|undefined;
  async function refresh(){
   controller?.abort();controller=new AbortController();
   try{const query=new URLSearchParams({path:pathname});if(selected)query.set("notification",selected);
    const response=await fetch(`/api/notifications/targets?${query}`,{cache:"no-store",signal:controller.signal});
    if(!stopped&&response.ok)setNotices((await response.json()).items);
   }catch{/* Keep the workflow usable if reference tracking is temporarily unavailable. */}
  }
  void refresh();const update=()=>void refresh();
  window.addEventListener("apgi-notifications-changed",update);window.addEventListener("focus",update);
  return()=>{stopped=true;controller?.abort();window.removeEventListener("apgi-notifications-changed",update);window.removeEventListener("focus",update);};
 },[pathname,selected]);
 useEffect(()=>{
  const mounted:Marker[]=[];
  for(const notice of notices){
   const anchor=notice.target_path?.split("#")[1];
   const target=anchor?document.getElementById(anchor):document.querySelector("main");
   if(!target)continue;
   const mount=document.createElement("div");mount.className="notification-reference-mount";
   if(target instanceof HTMLDetailsElement)target.querySelector(":scope>summary")?.after(mount);else target.prepend(mount);
   mounted.push({notice,mount});
   if(notice.id===selected){for(let node:HTMLElement|null=target;node;node=node.parentElement)if(node instanceof HTMLDetailsElement)node.open=true;}
  }
  setMarkers(mounted);
  const target=mounted.find(m=>m.notice.id===selected)?.mount;
  const key=`${pathname}:${selected}`;
  const frame=target&&revealed.current!==key?requestAnimationFrame(()=>{revealed.current=key;target.scrollIntoView({block:"start",behavior:"instant"});}):undefined;
  return()=>{if(frame!==undefined)cancelAnimationFrame(frame);for(const marker of mounted)marker.mount.remove();};
 },[notices,selected,pathname]);
 return <>{markers.map(({notice,mount})=>createPortal(<aside className="notification-reference" aria-label={notificationReference(notice)}><strong>{notificationReference(notice)} · {notice.pending?"Your response is required":"Update opened"}</strong><p>{notice.message}</p><p>{notice.requirement}</p><Link href={`/notifications#notification-${notice.id}`}>View notification and its tracking history</Link></aside>,mount,notice.id))}</>;
}
