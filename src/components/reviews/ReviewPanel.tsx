"use client";

import {useRef,useState} from "react";

import {ReviewForm} from "./ReviewForms";

import Link from "next/link";

import {declarationReference,satisfactoryParts,satisfactionStatement,type ReviewFinding,type SatisfactoryPart} from "@/lib/course-review";

const options=["Content","Quiz or scoring","Navigation","Accessibility","Design","E-book issue","Other"];

export function editableFindingComment(f:ReviewFinding) {

 if(f.comment!==undefined)return f.comment;

 const statement=satisfactionStatement(f.satisfiedParts??[]);

 if(f.text.startsWith(statement))return f.text.slice(statement.length).replace(/^\s*(?:Reviewer comments:\s*)?/,"").replace(/^Nothing to add\.$/,"");

 return f.text;

}

export function ReviewPanel({id,unit,canEdit,email,hasEbook,findings=[]}:{id:string;unit:string;canEdit:boolean;email:string;hasEbook:boolean;findings?:ReviewFinding[]}){

 const [open,setOpen]=useState(false),[message,setMessage]=useState("");

 const [parts,setParts]=useState<SatisfactoryPart[]>([]),[hasIssue,setHasIssue]=useState(false),[blocking,setBlocking]=useState(false);

 const [reference,setReference]=useState(""),[categories,setCategories]=useState(["Content"]),[comment,setComment]=useState(""),[editId,setEditId]=useState(""),[loadedAt,setLoadedAt]=useState("");

 const own=findings.filter(f=>f.author===email).sort((a,b)=>a.at.localeCompare(b.at)), latest=own.at(-1), selected=own.find(f=>f.id===editId);

 const isIssue=hasIssue||parts.length===0;

 const upload=useRef<HTMLInputElement>(null),replacement=useRef<HTMLDialogElement>(null),reopen=useRef<HTMLDialogElement>(null),pendingForm=useRef<HTMLFormElement|null>(null),replacementId=useRef("");

 function load(f?:ReviewFinding){

  setEditId(f?.id??"");setLoadedAt(f?.at??"");setReference(f?.reference??"");setParts(f?.satisfiedParts??[]);setCategories((f?.categories??(f?.category?[f.category]:["Content"])).filter(c=>c!=="Other"));

  setHasIssue(!!f&&f.outcome!=="satisfied");setBlocking(f?.blocking??false);setComment(f?editableFindingComment(f):"");setMessage("");

  if(upload.current)upload.current.value="";setOpen(true);

 }

 function toggle(){if(open){setOpen(false);return;}if(canEdit&&latest)reopen.current?.showModal();else setOpen(true);}

 function declare(part:SatisfactoryPart,checked:boolean){

  const next=satisfactoryParts(checked?[...parts,part]:parts.filter(p=>p!==part));

  if(!reference||reference===declarationReference(parts))setReference(declarationReference(next));setParts(next);

 }

 async function snapshot(){let stream:MediaStream|undefined;try{

  stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});

  const video=document.createElement("video");video.srcObject=stream;await video.play();

  const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext("2d")!.drawImage(video,0,0);

  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));

  if(blob&&upload.current){const data=new DataTransfer();data.items.add(new File([blob],"review-screenshot.png",{type:"image/png"}));upload.current.files=data.files;setMessage("Snapshot attached. Add your reference and comment, then save.");}

 }catch{setMessage("Capture was cancelled or is unavailable. You can upload a screenshot instead.");}finally{stream?.getTracks().forEach(t=>t.stop());}}

 return <aside className="review-floating" aria-label="Course feedback">

 <button className="primary-button" aria-expanded={open} onClick={toggle}>{open?"Close feedback":"Review feedback"}</button>

 <div className="review-floating-body" hidden={!open}><h2>Feedback for {unit.toUpperCase()}</h2>

 <p>Save a separate finding for each issue, even when several issues concern the same slide or question. Categories describe this finding.</p>

 {findings.length?<details><summary>Saved feedback for this LU ({findings.length})</summary>{findings.map(f=><article key={f.id}><strong>{f.reference} · {f.outcome==="satisfied"?"Nothing to add":f.status}</strong><p>{f.text}</p>{canEdit&&f.author===email?<button type="button" className="secondary-button" onClick={()=>load(f)}>Edit this saved finding</button>:null}<Link href={`/course-reviews/${id}#finding-${f.id}`}>Read discussion or verify this finding</Link></article>)}</details>:null}

 {canEdit?<>

 {own.length?<label>Saved finding to edit<select value={editId} onChange={e=>load(own.find(f=>f.id===e.target.value))}><option value="">Add another finding — keep all saved responses</option>{own.map(f=><option key={f.id} value={f.id}>{f.reference} · {f.category} · {f.text.slice(0,65)}</option>)}</select></label>:null}

 <ReviewForm preserveFields key={editId||"new"} id={id} operation="finding" hidden={{unit,outcome:isIssue?"issue":"satisfied"}} label={editId?"Save changes to this finding":"Save review feedback"} beforeSubmit={event=>{

  const data=new FormData(event.currentTarget),ref=String(data.get("reference")??"").trim().toLowerCase();

  const existing=own.find(f=>f.reference.toLowerCase()===ref);

  if(!data.get("replace_id")&&existing&&data.get("keep_all")!=="yes"){event.preventDefault();pendingForm.current=event.currentTarget;replacementId.current=existing.id;replacement.current?.showModal();}

 }}>

 <input type="hidden" name="replace_id" defaultValue={editId}/><input type="hidden" name="finding_version" value={loadedAt}/><input type="hidden" name="keep_all" defaultValue=""/>

 {selected?<p>Editing your saved finding. Earlier versions, discussion and attachments remain in the audit trail. Further feedback reopens a submitted report for a new version.</p>:null}

 <fieldset><legend>Review declarations — you can tick both</legend>

 {(["lu","quiz",...(hasEbook?["ebook"]:[])] as SatisfactoryPart[]).map(part=><label key={part}><input name="satisfied_part" type="checkbox" value={part} checked={parts.includes(part)} onChange={e=>declare(part,e.target.checked)}/> I am happy with {part==="lu"?"the learning unit / slides":part==="quiz"?"the quiz":"the e-book"}</label>)}

 <label><input name="has_issue" type="checkbox" checked={hasIssue} onChange={e=>{setHasIssue(e.target.checked);if(!e.target.checked&&!selected?.blocking)setBlocking(false);}}/> Something needs changing / I have a suggestion</label>

 <p>Declare the LU and quiz independently, or tick both. Comments, snapshots and uploads are available for every outcome.</p></fieldset>

 <label>Slide / quiz / question / e-book page reference<input name="reference" value={reference} onChange={e=>setReference(e.target.value)} required maxLength={200}/></label>

 <fieldset><legend>Categories — select all that apply</legend>{categories.map((category,index)=><div key={index}><label>Category {index+1}<select name="category" value={category} onChange={e=>setCategories(current=>current.map((v,i)=>i===index?e.target.value:v))}>{[...new Set([...options,category])].map(o=><option key={o}>{o}</option>)}</select></label>{category==="Other"?<label>Another category<input name="custom_category" required maxLength={80}/></label>:null}{index>0?<button type="button" className="secondary-button" onClick={()=>setCategories(current=>current.filter((_,i)=>i!==index))}>Remove category {index+1}</button>:null}</div>)}<button type="button" className="secondary-button" disabled={categories.length>=10} onClick={()=>setCategories(current=>[...current,"Content"])}>Add another category</button></fieldset>

 <label><input name="blocking" type="checkbox" checked={blocking} onChange={e=>{setBlocking(e.target.checked);if(e.target.checked)setHasIssue(true);}}/> Blocks publication until fixed and verified</label>

 <label>Comments / requested changes{!isIssue?" (optional)":""}<textarea name="comment" value={comment} onChange={e=>setComment(e.target.value)} required={isIssue} minLength={isIssue?3:undefined} maxLength={5000}/></label>

 {selected?.attachment?<p><a href={`/course-reviews/${id}/evidence/${selected.id}`} target="_blank" rel="noreferrer">View saved screenshot</a>. It is retained unless you upload a new image; earlier images remain in the audit trail.</p>:null}

 <button type="button" className="secondary-button" onClick={snapshot}>Take a snapshot</button><label>Upload a screenshot or image (optional, up to 2 MB)<input ref={upload} type="file" name="screenshot" accept="image/png,image/jpeg,image/webp"/></label>

 {!isIssue?<p>Your selected declarations and any comments or image attachment will be saved together. Confirm complete LU/quiz coverage separately after reviewing the entire unit.</p>:null}{message?<p role="status">{message}</p>:null}

 </ReviewForm></>:<p>This review is closed or overdue. Ask for an extension in the team workspace.</p>}

 </div>

 <dialog className="review-dialog" ref={reopen} aria-label="Edit saved review"><h2>You already reviewed this learning unit</h2><p>Would you like to edit your saved review? Your latest saved finding will be displayed. You can select any of your other findings in the editor.</p><button className="primary-button" onClick={()=>{load(latest);reopen.current?.close();}}>Yes — edit my saved review</button><button className="secondary-button" onClick={()=>{load();reopen.current?.close();}}>Add another finding — keep all responses</button><button className="secondary-button" onClick={()=>reopen.current?.close()}>Cancel</button></dialog>

 <dialog className="review-dialog" ref={replacement} aria-label="Keep or edit saved review feedback"><h2>You already reviewed this reference</h2><p>You may keep all review responses as separate findings, or edit your previous feedback. The earlier version, discussion and screenshot remain in the audit trail.</p>

 <button className="primary-button" onClick={()=>{const form=pendingForm.current,input=form?.elements.namedItem("keep_all") as HTMLInputElement|null;if(input&&form){input.value="yes";replacement.current?.close();form.requestSubmit();}}}>Keep all review findings — save this as another</button>

 <button className="secondary-button" onClick={()=>{load(own.find(f=>f.id===replacementId.current));replacement.current?.close();}}>Edit my previous feedback</button><button className="secondary-button" onClick={()=>replacement.current?.close()}>Cancel</button></dialog>

 </aside>;

}

