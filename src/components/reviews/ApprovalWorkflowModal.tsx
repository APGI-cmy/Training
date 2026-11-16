'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {approvalWorkflowOwnsAnchor,approvalWorkflowSummary} from '@/lib/approval-workflow';
import type {WorkflowStep} from '@/lib/publication-guide';
import {WorkflowSectionHeading} from './WorkflowSectionStatus';
import './approval-workflow.css';

export function ApprovalWorkflowModal({kind,title,course,email,step,roundId,revision,autoOpen=false,children}:{kind:'commercials'|'branding';title:string;course:string;email:string;step:WorkflowStep;roundId:string;revision:number;autoOpen?:boolean;children:ReactNode}){
 const router=useRouter();
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),[selected,setSelected]=useState('');
 const summary=approvalWorkflowSummary(step),cardId=`${kind}-workflow`,headingId=`${kind}-workflow-title`;
 const current=step.children?.find(task=>!task.done)?.id;
 useEffect(()=>{if(kind!=='commercials')return;const refresh=()=>router.refresh();const update=(event:StorageEvent)=>{if(event.key!=='apgi-review-updated')return;try{if(JSON.parse(event.newValue||'null')?.round===roundId)refresh();}catch{}};window.addEventListener('focus',refresh);window.addEventListener('storage',update);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',update);};},[kind,router,roundId]);
 useEffect(()=>{
  let frame:number|undefined;
  function reveal(){let anchor='';try{anchor=decodeURIComponent(location.hash.slice(1));}catch{return;}
   const owns=approvalWorkflowOwnsAnchor(kind,anchor),node=dialog.current;
   if(!node)return;
   if(!owns){if(node.open)node.close();if(!autoOpen||anchor)return;}
   if(!node.open)node.showModal();
   const task=step.children?.find(task=>task.href?.split('#')[1]===anchor);setSelected(task?.id??'');
   if(frame!==undefined)cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{const target=anchor?document.getElementById(anchor):null;if(target&&node.contains(target)){
    for(let parent:HTMLElement|null=target;parent&&parent!==node;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;
    target.scrollIntoView({block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
   }else node.scrollTop=0;});
  }
  function sameAnchor(event:MouseEvent){const a=event.target instanceof Element?event.target.closest('a'):null;if(a instanceof HTMLAnchorElement&&a.origin===location.origin&&a.pathname===location.pathname&&a.hash===location.hash)reveal();}
  reveal();window.addEventListener('hashchange',reveal);document.addEventListener('click',sameAnchor);
  return()=>{window.removeEventListener('hashchange',reveal);document.removeEventListener('click',sameAnchor);if(frame!==undefined)cancelAnimationFrame(frame);};
 },[kind,autoOpen,revision,step]);
 function open(anchor=kind==='commercials'?'commercial-preparation':'branding-review',task=''){
  const node=dialog.current;if(!node)return;setSelected(task);
  history.replaceState(history.state,'',`${location.pathname}${location.search}#${anchor}`);
  if(!node.open)node.showModal();
  const target=document.getElementById(anchor);
  if(target&&node.contains(target)){for(let parent:HTMLElement|null=target;parent&&parent!==node;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;target.scrollIntoView({block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}else node.scrollTop=0;
 }
 function closed(){let anchor='';try{anchor=decodeURIComponent(location.hash.slice(1));}catch{}
  if(approvalWorkflowOwnsAnchor(kind,anchor))history.replaceState(history.state,'',`${location.pathname}${location.search}#${cardId}`);
  trigger.current?.focus({preventScroll:true});
 }
 return <section className="approval-workflow-entry" id={cardId}>
  <button ref={trigger} type="button" className="primary-button" onClick={()=>open()}>Open {kind==='commercials'?'commercial':'branding and design'} workflow</button>
  <dialog ref={dialog} className="approval-workflow-dialog" aria-labelledby={headingId} onClose={closed}>
   <header className="approval-dialog-heading"><div><h2 id={headingId}>{title}</h2><p>{course} · {email}</p></div><button type="button" className="secondary-button" onClick={()=>dialog.current?.close()}>Close workflow</button></header>
   <section className="review-guidance" aria-label={`${kind==='commercials'?'Commercial':'Branding and design'} guidance`}><h3>{title} — required actions</h3><p role="status">{summary.text}</p><p>Signed in as {email}. Open the named person’s task below to read the exact saved version and make your own decision. Green ✓ means complete; red × means outstanding. Content endorsements do not approve commercial terms or branding.</p>
    <ol className="review-guidance-list" aria-label={`${kind==='commercials'?'Commercial':'Branding and design'} approval steps`}>{step.children?.map(task=><li key={task.id}><span className="review-guidance-status" data-complete={task.done} aria-label={task.done?'Complete':'Outstanding'}>{task.done?'✓':'×'}</span><div><button type="button" className="secondary-button" aria-current={selected===task.id?'step':undefined} onClick={()=>open(task.href?.split('#')[1]??(kind==='commercials'?'commercial-preparation':'branding-review'),task.id)}>{task.label}</button><p>{task.done?'This task is complete.':task.note||'Open this task to check the saved version and complete the requested decision.'}{current===task.id?' This is the next outstanding task.':''}</p></div></li>)}</ol>
    {!step.children?.length?<p>No additional reviewer decisions are assigned.</p>:null}
    <a href={`/course-reviews/${roundId}#review-guidance`}>Back to the main review guidance and reviewer history</a></section><div className="approval-workflow-content">{children}</div>
  </dialog>
 </section>;
}
