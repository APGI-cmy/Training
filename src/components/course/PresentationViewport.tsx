'use client';

import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import './presentation-viewport.css';

// Host-only sizing: keep the supplied course files and its learning header intact.
const learningFrameStyles = `
html.apgi-platform-embed .workspace{max-width:none;width:100%}
html.apgi-platform-embed #lesson{margin:8px;padding:12px 16px}
html.apgi-platform-embed .video-block video,
html.apgi-platform-embed .video-card video{display:block;width:100%!important;max-width:100%;height:auto;max-height:clamp(200px,calc(100dvh - 280px),900px)!important;object-fit:contain}
@media(max-width:600px){html.apgi-platform-embed #lesson{margin:4px;padding:10px}}
`;

// Resize the existing player; never remount it or open a second SCORM session.
export function PresentationViewport({title,children,navigation}:{title:string;children:ReactNode;navigation?:ReactNode}){
 const root=useRef<HTMLElement>(null),enlargeButton=useRef<HTMLButtonElement>(null),ownedFullscreen=useRef(false);
 const [expanded,setExpanded]=useState(false),[fullscreen,setFullscreen]=useState(false),[pending,setPending]=useState(false),[notice,setNotice]=useState('');
 const contentId=useId();
 useEffect(()=>{
  const section=root.current;
  if(!section)return;
  const frames=new Map<HTMLIFrameElement,()=>void>(),styles=new Map<Document,HTMLStyleElement>();
  function fit(frame:HTMLIFrameElement){
   try{
    const url=new URL(frame.src,window.location.href);
    if(url.origin!==window.location.origin||!/^\/courses\/Executive Assistant Training Programme\/LU[12]\/course\/index\.html$/.test(decodeURIComponent(url.pathname)))return;
    const doc=frame.contentDocument;
    if(!doc?.querySelector('#lesson')||styles.has(doc))return;
    const style=doc.createElement('style');style.textContent=learningFrameStyles;
    doc.head.append(style);doc.documentElement.classList.add('apgi-platform-embed');styles.set(doc,style);
   }catch{/* Other course hosts retain their own layout. */}
  }
  function sync(){
   const status=section!.querySelector('.scorm-status')?.textContent??'';
   section!.dataset.saveProblem=String(/could not|failed|connection|try again/i.test(status));
   for(const frame of section!.querySelectorAll<HTMLIFrameElement>('iframe')){
    if(!frames.has(frame)){const loaded=()=>fit(frame);frames.set(frame,loaded);frame.addEventListener('load',loaded);fit(frame);}
   }
  }
  const observer=new MutationObserver(sync);observer.observe(section,{childList:true,subtree:true,characterData:true});sync();
  return ()=>{observer.disconnect();for(const [frame,loaded] of frames)frame.removeEventListener('load',loaded);for(const [doc,style] of styles){style.remove();doc.documentElement.classList.remove('apgi-platform-embed');}};
 },[]);
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
   <button type="button" className="primary-button presentation-fullscreen-toggle" disabled={pending} aria-controls={contentId} onClick={()=>void fullScreen()}>{fullscreen?'Exit full screen':'Full screen'}</button>
   <span className="presentation-display-hint">{expanded?'Your place is kept when you return.':'Use the presentation controls for slides, audio, activities and quizzes.'}</span>
  </nav>
  {navigation?<div className="presentation-unit-navigation">{navigation}</div>:null}
  {notice?<p className="presentation-display-notice" role="status">{notice}</p>:null}
  <div id={contentId} className="presentation-display-content">{children}</div>
 </section>;
}
