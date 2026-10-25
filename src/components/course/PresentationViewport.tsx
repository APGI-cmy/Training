'use client';

import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import './presentation-viewport.css';

// Resize the existing player; never remount it or open a second SCORM session.
export function PresentationViewport({title,children}:{title:string;children:ReactNode}){
 const root=useRef<HTMLElement>(null),enlargeButton=useRef<HTMLButtonElement>(null),ownedFullscreen=useRef(false);
 const [expanded,setExpanded]=useState(false),[fullscreen,setFullscreen]=useState(false),[pending,setPending]=useState(false),[notice,setNotice]=useState('');
 const contentId=useId();
 const ownsFullscreen=()=>!!document.fullscreenElement&&!!root.current?.contains(document.fullscreenElement);
 function restore(){setExpanded(false);setNotice('');enlargeButton.current?.focus({preventScroll:true});}
 useEffect(()=>{
  function changed(){
   const owns=!!document.fullscreenElement&&!!root.current?.contains(document.fullscreenElement);
   setFullscreen(owns);
   if(owns)setExpanded(true);
   else if(ownedFullscreen.current)restore();
   ownedFullscreen.current=owns;
  }
  document.addEventListener('fullscreenchange',changed);
  return ()=>{document.removeEventListener('fullscreenchange',changed);};
 },[]);
 useEffect(()=>{
  if(!expanded)return;
  function escape(event:KeyboardEvent){
   if(event.key==='Escape'&&!document.fullscreenElement&&!root.current?.querySelector('dialog[open]'))restore();
  }
  document.addEventListener('keydown',escape);
  return ()=>document.removeEventListener('keydown',escape);
 },[expanded]);
 async function close(){
  if(ownsFullscreen()){
   try{await document.exitFullscreen();}catch{setNotice('Use Escape to leave full screen.');return;}
  }
  restore();
 }
 async function fullScreen(){
  if(ownsFullscreen()){await close();return;}
  setExpanded(true);setNotice('');
  if(!root.current?.requestFullscreen){setNotice('Browser full screen is unavailable. The presentation is enlarged to fill this window.');return;}
  setPending(true);
  try{await root.current.requestFullscreen();}
  catch{if(!ownsFullscreen())setNotice('Browser full screen could not open. The presentation is enlarged to fill this window.');}
  finally{setPending(false);}
 }
 return <section ref={root} className="presentation-viewport" data-expanded={expanded?'true':'false'} aria-label={`${title} presentation display`}>
  <nav className="presentation-display-controls" aria-label="Presentation display controls">
   <strong>Presentation</strong>
   <button ref={enlargeButton} type="button" className="secondary-button" aria-controls={contentId} aria-expanded={expanded} onClick={()=>expanded?void close():setExpanded(true)}>{expanded?'Return to page':'Enlarge presentation'}</button>
   <button type="button" className="primary-button" disabled={pending} aria-controls={contentId} onClick={()=>void fullScreen()}>{fullscreen?'Exit full screen':'Full screen'}</button>
   <span className="presentation-display-hint">{expanded?'Your place is kept when you return.':'Use the presentation controls for slides, audio, activities and quizzes.'}</span>
  </nav>
  {notice?<p className="presentation-display-notice" role="status">{notice}</p>:null}
  <div id={contentId} className="presentation-display-content">{children}</div>
 </section>;
}
