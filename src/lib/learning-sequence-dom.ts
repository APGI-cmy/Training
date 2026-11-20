import {emptySequence,sequenceKey,sequenceStepAllowed,sequenceSummaryAllowed,type SequenceRecord,type SequenceState} from './learning-sequence';

type Profile={id:string;begin:string;steps:string;summary:string;modal:string;alternatives?:boolean;firstVisible?:boolean};
// These are authored interaction contracts, not a guess at the order of every button.
export const activityProfiles:Profile[]=[
 {id:'declared-v1',begin:'[data-learning-begin]',steps:'[data-learning-step]',summary:'[data-learning-summary]',modal:'[data-learning-summary-panel]'},
 {id:'decision-v1',begin:'#begin',steps:'#continue-decision,button[data-choice]',summary:'#open-summary',modal:'#summary-modal',alternatives:true},
 {id:'foundation-v1',begin:'#begin',steps:'#navigation .nav-item',summary:'#open-summary',modal:'#summary-modal',firstVisible:true},
 {id:'states-v1',begin:'#begin',steps:'#activity-nav button',summary:'#next-state',modal:'#summary-modal',firstVisible:true},
 {id:'steps-v1',begin:'#begin',steps:'#step-nav button',summary:'#next-step',modal:'#summary-modal',firstVisible:true},
 ...['stage','role','panel','layer','step','item'].map(name=>({id:`indexed-${name}-v1`,begin:'#begin',steps:`[data-${name}]`,summary:'#summary',modal:'#summary-modal',firstVisible:true})),
 {id:'scannex-v1',begin:'#begin',steps:'button[data-step]',summary:'#show-summary',modal:'#summary',firstVisible:true},
 {id:'scannex-items-v1',begin:'#begin',steps:'button[data-i]',summary:'#show-summary',modal:'#summary',firstVisible:true}
];
type Options={load:(key:string)=>SequenceRecord|undefined;save:(record:SequenceRecord)=>Promise<void>;completed:()=>boolean;changed:()=>void};
export function activityProfile(doc:Document){return activityProfiles.find(p=>doc.querySelector(p.begin)&&doc.querySelector(p.steps)&&doc.querySelector(p.modal));}
export function attachActivitySequence(doc:Document,options:Options){
 const profile=activityProfile(doc);if(!profile)return null;
 const source=doc.location.pathname;
 if(!source.startsWith('/courses/'))return null;
 const controls=()=>{let raw=Array.from(doc.querySelectorAll<HTMLElement>(profile.steps));if(profile.id==='declared-v1'){raw.sort((a,b)=>Number(a.dataset.learningStep)-Number(b.dataset.learningStep));if(raw.some((el,index)=>el.dataset.learningStep!==String(index)))return [];}return profile.alternatives?[raw.filter(e=>e.id==='continue-decision'),raw.filter(e=>e.hasAttribute('data-choice'))]:raw.map(e=>[e]);};
 let groups=controls();
 if(!groups.length||groups.some(g=>!g.length)||groups.length>120)return null;
 const identity={document:source,profile:profile.id,steps:groups.length},key=sequenceKey(identity);
 let state:SequenceState=options.load(key)??emptySequence(),failed=false,disposed=false,saving=false;
 const backlog:SequenceRecord[]=[];
 const begin=doc.querySelector<HTMLElement>(profile.begin)!,modal=doc.querySelector<HTMLElement>(profile.modal)!;
 let summary=doc.querySelector<HTMLElement>(profile.summary);
 const note=doc.createElement('div');note.setAttribute('data-learning-sequence-guidance','');note.setAttribute('role','status');note.setAttribute('aria-live','polite');
 note.style.cssText='padding:10px 14px;margin:8px 0;border:1px solid currentColor;border-radius:6px;background:#fff;color:#142d49;font:600 14px/1.4 Arial,sans-serif';
 const text=doc.createElement('span'),retry=doc.createElement('button');retry.type='button';retry.textContent='Retry saving';retry.hidden=true;retry.style.marginLeft='10px';note.append(text,retry);
 (summary?.parentElement??begin.parentElement??doc.body).append(note);
 const style=doc.createElement('style');style.textContent='[data-learning-sequence-locked]{opacity:.48!important;cursor:not-allowed!important}';doc.head.append(style);
 const owned=new Map<Element,{disabled:boolean|null;tabindex:string|null;aria:string|null}>();
 function lock(el:Element,locked:boolean){
  if(locked){if(!owned.has(el))owned.set(el,{disabled:'disabled'in el?(el as HTMLButtonElement).disabled:null,tabindex:el.getAttribute('tabindex'),aria:el.getAttribute('aria-disabled')});
   el.setAttribute('data-learning-sequence-locked','');el.setAttribute('aria-disabled','true');if('disabled'in el)(el as HTMLButtonElement).disabled=true;else el.setAttribute('tabindex','-1');
  }else if(owned.has(el)){const original=owned.get(el)!;if(original.disabled!==null)(el as HTMLButtonElement).disabled=original.disabled;original.tabindex===null?el.removeAttribute('tabindex'):el.setAttribute('tabindex',original.tabindex);original.aria===null?el.removeAttribute('aria-disabled'):el.setAttribute('aria-disabled',original.aria);el.removeAttribute('data-learning-sequence-locked');owned.delete(el);}
 }
 const shown=(el:HTMLElement)=>!el.hidden&&el.getAttribute('aria-hidden')!=='true'&&doc.defaultView?.getComputedStyle(el).display!=='none';
 function paint(){
  if(groups.some(g=>g.some(el=>!doc.contains(el)))){const next=controls();if(next.length===identity.steps)groups=next;}
  summary=doc.querySelector<HTMLElement>(profile!.summary);
  if(!doc.contains(note))(summary?.parentElement??begin.parentElement??doc.body).append(note);
  const completed=options.completed();
  groups.forEach((group,index)=>group.forEach(el=>lock(el,!sequenceStepAllowed(state,index,groups.length,completed))));
  // The state/step forward button also advances between topics; only its final
  // summary activation has the summary prerequisite.
  if(summary&&summary.id!=='next-state'&&summary.id!=='next-step')lock(summary,!sequenceSummaryAllowed(state,groups.length,completed));
  const message=failed?'Progress could not be saved. Retry saving before continuing.':backlog.length?'Saving your activity progress…':completed?'Activity completion retained. You can revisit any section.':!state.begun?'Select Begin activity to start.':!sequenceSummaryAllowed(state,groups.length)?`Select section ${state.through+2} of ${groups.length} to continue.`:!state.summary?'Open the activity summary to continue.':'Activity summary saved. You can select Next.';
  if(text.textContent!==message)text.textContent=message;retry.hidden=!failed;
  options.changed();
 }
 async function drain(){
  if(saving||failed||disposed)return;saving=true;
  try{while(backlog.length){await options.save(backlog[0]);backlog.shift();}}
  catch{failed=true;}
  finally{saving=false;if(!disposed)paint();}
 }
 function persist(){backlog.push({...identity,...state});paint();void drain();}
 function start(){if(state.begun||options.completed())return;state={...state,begun:true,through:profile!.firstVisible?0:-1};persist();}
 function select(index:number){if(!sequenceStepAllowed(state,index,groups.length,options.completed()))return false;if(index>state.through&&!options.completed()){state={...state,through:index};persist();}return true;}
 function block(event:Event){event.preventDefault();event.stopImmediatePropagation();paint();}
 function click(event:Event){
  paint();
  const target=event.target as Element|null;if(!target?.closest)return;
  const index=groups.findIndex(g=>g.some(e=>e===target||e.contains(target)));
  if(index>=0){if(!select(index))block(event);return;}
  if(begin===target||begin.contains(target)){start();return;}
  if(summary&&(summary===target||summary.contains(target))&&['next-state','next-step'].includes(summary.id)){
   const current=groups.findIndex(g=>g.some(el=>el.getAttribute('aria-selected')==='true'||el.getAttribute('aria-current')==='step'||el.classList.contains('active')));
   if(current<groups.length-1){if(!select(current+1))block(event);}else if(!sequenceSummaryAllowed(state,groups.length,options.completed()))block(event);
   return;
  }
  if(summary&&(summary===target||summary.contains(target))&&summary.id!=='next-state'&&summary.id!=='next-step'&&!sequenceSummaryAllowed(state,groups.length,options.completed()))block(event);
 }
 function keydown(event:KeyboardEvent){
  const target=event.target as Element|null,index=groups.findIndex(g=>g.some(e=>e===target||!!target&&e.contains(target)));
  if(index<0)return;
  if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key)){
   const next=event.key==='Home'?0:event.key==='End'?groups.length-1:index+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1);
   if(next>=0&&next<groups.length&&!select(next))block(event);
  }else if(['Enter',' '].includes(event.key)&&!sequenceStepAllowed(state,index,groups.length,options.completed()))block(event);
 }
 const retrySave=()=>{failed=false;void drain();paint();};retry.addEventListener('click',retrySave);doc.addEventListener('click',click,true);doc.addEventListener('keydown',keydown,true);
 paint();
 return {key,profile:profile.id,refresh(){
  // Keyboard navigation and the authored Next-topic controls can change the
  // selected topic without a click on its tab. Count only the next legal topic.
  if(state.begun&&!profile.alternatives&&!options.completed()){
   const index=groups.findIndex(g=>g.some(el=>el.getAttribute('aria-selected')==='true'||el.getAttribute('aria-pressed')==='true'||el.getAttribute('aria-current')==='step'||el.classList.contains('active')||el.classList.contains('is-active')));
   if(index>=0&&index>state.through&&sequenceStepAllowed(state,index,groups.length))select(index);
  }
  if(!state.summary&&sequenceSummaryAllowed(state,groups.length)&&shown(modal)){state={...state,summary:true};persist();}
  paint();
 },canLeave:()=>options.completed()||state.summary&&!backlog.length&&!failed,summaryReady:()=>options.completed()||sequenceSummaryAllowed(state,groups.length)&&state.summary&&!backlog.length&&!failed,
 dispose(){disposed=true;doc.removeEventListener('click',click,true);doc.removeEventListener('keydown',keydown,true);retry.removeEventListener('click',retrySave);for(const el of [...owned.keys()])lock(el,false);note.remove();style.remove();}};
}
