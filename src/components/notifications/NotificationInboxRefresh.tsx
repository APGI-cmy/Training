'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
export function NotificationInboxRefresh(){
 const router=useRouter();
 useEffect(()=>{
  function legacyReference(){
   const id=location.hash.match(/^#notification-([0-9a-f-]{36})$/i)?.[1];
   if(id&&!new URLSearchParams(location.search).has('notification')){router.replace(`/notifications?view=all&notification=${id}#notification-${id}`);return true;}return false;
  }
  const refresh=()=>{if(document.visibilityState==='visible'&&!legacyReference())router.refresh();};
  const reviewSaved=(event:StorageEvent)=>{if(event.key==='apgi-review-updated')refresh();};
  legacyReference();const timer=setInterval(refresh,30000);
  window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('apgi-notifications-changed',refresh);window.addEventListener('storage',reviewSaved);window.addEventListener('hashchange',legacyReference);document.addEventListener('visibilitychange',refresh);
  return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('apgi-notifications-changed',refresh);window.removeEventListener('storage',reviewSaved);window.removeEventListener('hashchange',legacyReference);document.removeEventListener('visibilitychange',refresh);};
 },[router]);
 return null;
}
