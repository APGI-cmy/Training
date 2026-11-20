import {attachActivitySequence} from './learning-sequence-dom';
import {sequenceKey,type SequenceRecord} from './learning-sequence';
import type {TigerNativePlayer} from './tiger-player';

type Connector={register:(player:TigerNativePlayer)=>void};
export type TrainingSequenceOptions={host:Window;frame:HTMLIFrameElement;records:SequenceRecord[];save:(record:SequenceRecord)=>Promise<SequenceRecord>;completed:(doc:Document)=>boolean;forwardAllowed?:(slide:number)=>boolean;status:(text:string)=>void;changed?:(locked:boolean)=>void};
export function attachTrainingSequencing(options:TrainingSequenceOptions){
 const {host,frame}=options,connectorHost=host as unknown as {ispringPresentationConnector?:Connector},previous=connectorHost.ispringPresentationConnector;
 const saved=new Map(options.records.map(r=>[sequenceKey(r),r])),documents=new Map<Document,ReturnType<typeof attachActivitySequence>>();
 const locks=new Map<Element,{disabled:boolean|null;aria:string|null;href:string|null}>();
 let player:TigerNativePlayer|null=null,active=true,lastSlide=0,redirecting=false;
 function visible(element:Element){const r=element.getBoundingClientRect(),win=element.ownerDocument.defaultView;return !!win&&r.width>0&&r.height>0&&win.getComputedStyle(element).display!=='none'&&win.getComputedStyle(element).visibility!=='hidden';}
 function children(){const result:Document[]=[];function walk(f:HTMLIFrameElement,depth:number){if(depth>6||!visible(f))return;try{const doc=f.contentDocument;if(!doc||doc.location.origin!==host.location.origin)return;result.push(doc);doc.querySelectorAll('iframe').forEach(child=>walk(child,depth+1));}catch{/* Only same-origin course documents participate. */}}walk(frame,0);return result;}
 function current(){try{return player?player.view().playbackController().currentSlideIndex()+1:0;}catch{return 0;}}
 function lock(el:Element,disabled:boolean){
  if(disabled){if(!locks.has(el))locks.set(el,{disabled:'disabled'in el?(el as HTMLButtonElement).disabled:null,aria:el.getAttribute('aria-disabled'),href:el.getAttribute('href')});el.setAttribute('aria-disabled','true');el.setAttribute('data-learning-sequence-locked','');if('disabled'in el)(el as HTMLButtonElement).disabled=true;if(el.tagName==='A')el.removeAttribute('href');}
  else if(locks.has(el)){const original=locks.get(el)!;if(original.disabled!==null)(el as HTMLButtonElement).disabled=original.disabled;original.aria===null?el.removeAttribute('aria-disabled'):el.setAttribute('aria-disabled',original.aria);if(original.href!==null)el.setAttribute('href',original.href);el.removeAttribute('data-learning-sequence-locked');locks.delete(el);}
 }
 function eaBlocked(){
  const doc=frame.contentDocument,ack=doc?.getElementById('acknowledge');
  return !!ack&&!!doc?.getElementById('contents')&&(!/Reviewed\s*✓/.test(ack.textContent??'')||!!doc.querySelector('#save-status.warning'));
 }
 function forwardControl(button:Element){const label=(button.getAttribute('aria-label')||button.textContent||'').trim();return /^next(?:\s*[›»→])?$/i.test(label)||!!button.ownerDocument.getElementById('acknowledge')&&/^Next learning activity\s*→?$/i.test(label);}
 function blocked(){return eaBlocked()||!!options.forwardAllowed&&!options.forwardAllowed(current()+1)||[...documents].some(([doc,sequence])=>!!sequence&&doc.defaultView&&children().includes(doc)&&!sequence.canLeave());}
 function paint(){
  if(!active)return;const disabled=blocked();options.changed?.(disabled);
  try{for(const button of frame.contentDocument?.querySelectorAll('button,[role="button"]')??[]){if(forwardControl(button))lock(button,disabled);else if(locks.has(button))lock(button,false);}}catch{}
  const ea=frame.contentDocument;
  if(ea?.getElementById('acknowledge')&&ea.getElementById('contents')){
   const entries=Array.from(ea.querySelectorAll('#contents button')),position=entries.findIndex(e=>e.getAttribute('aria-current')==='step');
   for(const [index,entry]of entries.entries())lock(entry,eaBlocked()&&index>position);
   let note=ea.getElementById('learning-sequence-ea-guidance');if(!note){note=ea.createElement('p');note.id='learning-sequence-ea-guidance';note.setAttribute('role','status');ea.querySelector('.lesson-footer')?.after(note);}
   const message=eaBlocked()?'Complete this activity and select “Mark this activity reviewed” before continuing.':'';if(note.textContent!==message)note.textContent=message;
  }
  for(const control of host.document.querySelectorAll('nav.unit-navigation .primary-button,.activity-toolbar .button-row .primary-button'))if(/^(?:Next:|Finish\s*[—-])/i.test((control.textContent??'').trim()))lock(control,disabled);
 }
 function intercept(event:Event){
  if(!blocked())return;const target=event.target as Element|null;
  const button=target?.closest?.('button,[role="button"]');
  if(button&&forwardControl(button)){event.preventDefault();event.stopImmediatePropagation();paint();}
 }
 function keyboard(event:KeyboardEvent){if(!blocked()||!['ArrowRight','PageDown'].includes(event.key))return;const eaNext=frame.contentDocument?.getElementById('next');if(!player&&eaNext&&frame.contentDocument?.getElementById('acknowledge')&&!forwardControl(eaNext))return;const target=event.target as Element|null;if(target?.closest?.('input,textarea,select,video,audio'))return;event.preventDefault();event.stopImmediatePropagation();}
 const bound=new Set<Document>();
 const changed=()=>paint();
 const connector:Connector={register(candidate){
  try{if(candidate.view().displayObject().ownerDocument!==frame.contentDocument)return;}catch{return;}
  previous?.register(candidate);player=candidate;lastSlide=current();paint();
 }};
 connectorHost.ispringPresentationConnector=connector;
 const tick=()=>{
  if(!active)return;const docs=children();
  for(const doc of docs){
   if(doc===frame.contentDocument&&!bound.has(doc)){doc.addEventListener('click',intercept,true);doc.addEventListener('keydown',keyboard,true);bound.add(doc);}
   if(!documents.has(doc)){
    const sequence=attachActivitySequence(doc,{load:key=>saved.get(key),save:async record=>{const result=await options.save(record);saved.set(sequenceKey(result),result);},completed:()=>options.completed(doc),changed});
    // Dynamic authoring engines populate navigation after document load.
    if(sequence)documents.set(doc,sequence);
   }
   documents.get(doc)?.refresh();
  }
  for(const [doc,sequence] of documents)if(!doc.defaultView||!docs.includes(doc)){sequence?.dispose();documents.delete(doc);}
  const now=current();
  if(now&&lastSlide&&now>lastSlide&&options.forwardAllowed&&!options.forwardAllowed(now)&&!redirecting){redirecting=true;player!.view().playbackController().gotoSlide(lastSlide-1,false);redirecting=false;}
  else if(now)lastSlide=now;
  paint();
 };
 const timer=host.setInterval(tick,150);
 return {summaryReady(doc:Document){return documents.get(doc)?.summaryReady()??options.completed(doc);},
 dispose(){active=false;host.clearInterval(timer);for(const sequence of documents.values())sequence?.dispose();for(const doc of bound){doc.removeEventListener('click',intercept,true);doc.removeEventListener('keydown',keyboard,true);}for(const el of [...locks.keys()])lock(el,false);if(connectorHost.ispringPresentationConnector===connector){if(previous)connectorHost.ispringPresentationConnector=previous;else delete connectorHost.ispringPresentationConnector;}}};
}
