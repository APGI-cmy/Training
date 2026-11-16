'use client';
import {useEffect,useState} from 'react';

export function TigerNextLink({courseSlug,unitSlug,href,label,initiallyUnlocked=false}:{courseSlug:string;unitSlug:string;href:string;label:string;initiallyUnlocked?:boolean}){
  const [unlocked,setUnlocked]=useState(initiallyUnlocked);
  useEffect(()=>{
    let active=true;setUnlocked(initiallyUnlocked);
    const changed=(event:Event)=>{const data=(event as CustomEvent).detail;if(data?.courseSlug===courseSlug&&data?.unitSlug===unitSlug&&data?.qualified===true)setUnlocked(true);};
    window.addEventListener('tiger:unit-qualified',changed);
    void fetch(`/api/tiger-progress?courseSlug=${encodeURIComponent(courseSlug)}&unitSlug=${encodeURIComponent(unitSlug)}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(active&&data?.qualified)setUnlocked(true);}).catch(()=>{});
    return()=>{active=false;window.removeEventListener('tiger:unit-qualified',changed);};
  },[courseSlug,unitSlug,initiallyUnlocked]);
  return unlocked?<a className="primary-button" href={href}>{label}</a>:<span><button className="primary-button" disabled>{label}</button><small role="status"> Complete the video, activity summaries and quiz to continue.</small></span>;
}
