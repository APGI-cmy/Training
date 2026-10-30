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
 return <section className="review-box approval-workflow-summary" id={cardId}>
  <WorkflowSectionHeading title={title} step={step}/><p>{summary.text}</p>
  {summary.pending.length?<p><strong>Still required:</strong> {summary.pending.map(task=>task.label).join('; ')}.</p>:null}
  <button ref={trigger} type="button" className="primary-button" onClick={()=>open()}>Open {kind==='commercials'?'commercial':'branding and design'} workflow</button>
  <dialog ref={dialog} className="approval-workflow-dialog" aria-labelledby={headingId} onClose={closed}>
   <header className="approval-dialog-heading"><div><h2 id={headingId}>{title}</h2><p>{course} · {email}</p></div><button type="button" className="secondary-button" onClick={()=>dialog.current?.close()}>Close workflow</button></header>
   <p className="approval-dialog-summary" role="status">{summary.text}</p>
   <div className="approval-workflow-layout"><nav className="approval-workflow-nav" aria-label={`${kind==='commercials'?'Commercial':'Branding and design'} approval steps`}>
    <h3>Approval workflow</h3><p>✓ Complete · × Outstanding. Select a task to go directly to its saved record or decision.</p>
    <button type="button" className="secondary-button" onClick={()=>open()}>Workflow overview</button>
    {step.children?.map(task=><button key={task.id} type="button" className="approval-workflow-step" data-complete={task.done} aria-current={selected===task.id?'step':undefined} onClick={()=>open(task.href?.split('#')[1]??(kind==='commercials'?'commercial-preparation':'branding-review'),task.id)}><strong>{task.done?'✓':'×'} {task.number}. {task.label}</strong><small>{task.done?'Complete':'Not complete'}{current===task.id?' · Next outstanding task':''}</small></button>)}
    {!step.children?.length?<p>No additional reviewer decisions are assigned.</p>:null}
   </nav><div className="approval-workflow-content">{children}</div></div>
  </dialog>
 </section>;
}
