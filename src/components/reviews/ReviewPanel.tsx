"use client";
import {SummaryText} from "@/components/shared/SummaryText";


import {useRef,useState} from "react";

import {ReviewForm} from "./ReviewForms";

import Link from "next/link";

import {satisfactoryParts,satisfactionStatement,type ReviewFinding,type SatisfactoryPart} from "@/lib/course-review";
import {declarationChoices} from "@/lib/review-declarations";
import {courseWideReference,slideReference} from '@/lib/review-slide';
import {useReviewSlide} from './ReviewSlideTracking';
import {ReviewScreenshot} from './ReviewScreenshot';

const options=["Content","Quiz or scoring","Navigation","Accessibility","Design","E-book issue","Other"];

export function editableFindingComment(f:ReviewFinding) {

 if(f.comment!==undefined)return f.comment;

 const statement=satisfactionStatement(f.satisfiedParts??[]);

 if(f.text.startsWith(statement))return f.text.slice(statement.length).replace(/^\s*(?:Reviewer comments:\s*)?/,"").replace(/^Nothing to add\.$/,"");

 return f.text;

}

export function ReviewPanel({id,unit,canEdit,email,hasEbook,findings=[],disabledReason,openOnLoad=false,initialFindingId}:{id:string;unit:string;canEdit:boolean;email:string;hasEbook:boolean;findings?:ReviewFinding[];disabledReason?:string;openOnLoad?:boolean;initialFindingId?:string}){

 const initial=canEdit?findings.find(f=>f.id===initialFindingId&&f.author===email&&(f.unit===unit||f.scope==='course')):undefined;
 const [open,setOpen]=useState(openOnLoad||!!initial),[message,setMessage]=useState("");

 const [parts,setParts]=useState<SatisfactoryPart[]>(initial?.satisfiedParts??[]),[hasIssue,setHasIssue]=useState(!!initial&&initial.outcome!=="satisfied"),[blocking,setBlocking]=useState(initial?.blocking??false);

 const [scope,setScope]=useState<'current'|'course'>(initial?.scope==='course'?'course':'current'),[categories,setCategories]=useState(initial?.categories??[initial?.category??"Content"]),[comment,setComment]=useState(initial?editableFindingComment(initial):""),[editId,setEditId]=useState(initial?.id??""),[loadedAt,setLoadedAt]=useState(initial?.at??"");
 const [draftVersion,setDraftVersion]=useState(0);
 const slide=useReviewSlide(unit);

 const localFindings=findings.filter(f=>f.scope!=='course'&&f.unit===unit),sharedFindings=findings.filter(f=>f.scope==='course');
 const own=localFindings.filter(f=>f.author===email).sort((a,b)=>a.at.localeCompare(b.at)),latest=own.at(-1);
 const editableFindings=[...own,...sharedFindings.filter(f=>f.author===email)],selected=editableFindings.find(f=>f.id===editId);
 const keepsReference=!!selected&&selected.scope!=='course'&&scope==='current';
 const reference=scope==='course'?courseWideReference:keepsReference?selected.reference:(slide?slideReference(slide):'Waiting for the current slide…');

 const isIssue=hasIssue||parts.length===0;
 const choices=declarationChoices(parts,hasIssue,hasEbook),hasDeclaration=hasIssue||parts.length>0;

 const replacement=useRef<HTMLDialogElement>(null),reopen=useRef<HTMLDialogElement>(null),pendingForm=useRef<HTMLFormElement|null>(null),replacementId=useRef("");

 function load(f?:ReviewFinding){
  setDraftVersion(v=>v+1);

  setEditId(f?.id??"");setLoadedAt(f?.at??"");setScope(f?.scope==='course'?'course':'current');setParts(f?.satisfiedParts??[]);setCategories((f?.categories??(f?.category?[f.category]:["Content"])).filter(c=>c!=="Other"));

  setHasIssue(!!f&&f.outcome!=="satisfied");setBlocking(f?.blocking??false);setComment(f?editableFindingComment(f):"");setMessage("");

  setOpen(true);

 }

 function toggle(){if(open){setOpen(false);return;}if(canEdit&&latest)reopen.current?.showModal();else setOpen(true);}


 function declare(part:SatisfactoryPart,checked:boolean){

  const next=satisfactoryParts(checked?[...parts,part]:parts.filter(p=>p!==part));

  setParts(next);

 }

 return <aside className="review-floating" aria-label="Course feedback">

 <button className="primary-button" aria-expanded={open} onClick={toggle}>{open?"Close feedback":"Review feedback"}</button>

 <div className="review-floating-body" hidden={!open}><h2>Feedback for {unit.toUpperCase()}</h2>

 <p>Save a separate finding for each issue. The current slide is recorded automatically. Choose all slides when the same finding applies throughout this course.</p>

 <details><summary>Saved feedback for {unit.toUpperCase()} only ({localFindings.length})</summary>{localFindings.length?localFindings.map(f=><article key={f.id}><strong>{unit.toUpperCase()} · {f.reference} · {f.outcome==="satisfied"?"Nothing to add":f.status}</strong><SummaryText text={f.text}/>{canEdit&&f.author===email?<button type="button" className="secondary-button" onClick={()=>load(f)}>Edit this saved finding</button>:null}<Link href={`/course-reviews/${id}#finding-${f.id}`}>Read discussion or verify this finding</Link></article>):<p>No feedback saved specifically for {unit.toUpperCase()} yet.</p>}</details>
 {sharedFindings.length?<details><summary>Course-wide findings — all LUs ({sharedFindings.length})</summary><p>These were explicitly marked applicable to all slides. They are separate from this LU’s own feedback.</p>{sharedFindings.map(f=><article key={f.id}><strong>All LUs · {f.outcome==='satisfied'?'Nothing to add':f.status}</strong><SummaryText text={f.text}/>{canEdit&&f.author===email?<button type="button" className="secondary-button" onClick={()=>load(f)}>Edit this course-wide finding</button>:null}<Link href={`/course-reviews/${id}#finding-${f.id}`}>Read shared discussion or verify this finding</Link></article>)}</details>:null}

 {canEdit?<>

 {own.length?<label>Saved {unit.toUpperCase()} finding to edit<select value={selected?.scope==='course'?'':editId} onChange={e=>load(own.find(f=>f.id===e.target.value))}><option value="">Add another finding — keep all saved responses</option>{own.map(f=><option key={f.id} value={f.id}>{f.reference} · {f.category} · {f.text.slice(0,65)}</option>)}</select></label>:null}
 {selected?.scope==='course'?<p>Editing a course-wide finding. Changes apply to all LUs. <button type="button" className="secondary-button" onClick={()=>load()}>Add a new finding for {unit.toUpperCase()} instead</button></p>:null}

 <ReviewForm preserveFields key={`${id}:${unit}:${editId||"new"}:${loadedAt}:${draftVersion}`} id={id} operation="finding" disabled={!hasDeclaration||choices.conflict||(scope==='current'&&!keepsReference&&!slide)} hidden={{unit:selected?.scope==='course'?selected.unit:unit,outcome:isIssue?"issue":"satisfied"}} label={editId?"Save changes to this finding":"Save review feedback"} beforeSubmit={event=>{

  const data=new FormData(event.currentTarget),ref=String(data.get("reference")??"").trim().toLowerCase();

  const existing=editableFindings.find(f=>f.reference.toLowerCase()===ref);

  if(!data.get("replace_id")&&existing&&data.get("keep_all")!=="yes"){event.preventDefault();pendingForm.current=event.currentTarget;replacementId.current=existing.id;replacement.current?.showModal();}

 }}>

 <input type="hidden" name="replace_id" defaultValue={editId}/><input type="hidden" name="finding_version" value={loadedAt}/><input type="hidden" name="keep_all" defaultValue=""/>
 <input type="hidden" name="reference" value={reference}/><input type="hidden" name="slide_unit" value={unit}/><input type="hidden" name="slide_number" value={slide?.number??''}/><input type="hidden" name="slide_title" value={slide?.title??''}/>

 {selected?<p>Editing your saved finding. Earlier versions, discussion and attachments remain in the audit trail. Further feedback reopens a submitted report for a new version.</p>:null}

 <fieldset><legend>Review declarations — choose the combination that applies</legend>

 {(["lu","quiz",...(hasEbook?["ebook"]:[])] as SatisfactoryPart[]).map(part=><label key={part}><input name="satisfied_part" type="checkbox" value={part} checked={parts.includes(part)} disabled={choices.partDisabled(part)} onChange={e=>declare(part,e.target.checked)}/> I am happy with {part==="lu"?"the learning unit / slides":part==="quiz"?"the quiz":"the e-book"}</label>)}

 <label><input name="has_issue" type="checkbox" checked={hasIssue} disabled={choices.issueDisabled} onChange={e=>{setHasIssue(e.target.checked);if(!e.target.checked)setBlocking(false);}}/> Something needs changing / I have a suggestion</label>

 <p>{hasEbook?"Leave the item needing a change unticked in the happy declarations.":"Select both happy declarations, one happy declaration plus something needs changing, or something needs changing on its own. With two selected, the third is disabled. Untick a choice to change the combination."}</p>
 <p role="status">{choices.conflict?"These saved choices conflict. Untick a happy declaration or untick something needs changing before saving.":!hasDeclaration?"Choose a declaration before saving.":isIssue?"Saving records an open finding. It does not mark a correction fixed or verified.":"Saving records Nothing to add · closed for your selected declarations. This is a no-issue declaration, not verification of a correction."}</p>
 <p>Your choices determine the status. Comments only explain your choices and do not change the status.</p></fieldset>

 <label>This finding applies to<select name="finding_scope" value={scope} onChange={e=>setScope(e.target.value as 'current'|'course')}><option value="current" disabled={selected?.scope==='course'}>Current slide</option><option value="course">Applicable to all slides</option></select></label>
 <p aria-live="polite"><strong>Reference: {scope==='current'?`${unit.toUpperCase()} · `:''}{reference}</strong></p>
 {scope==='course'?<p>This finding is shared automatically with every learning unit in this course review. Its discussion, screenshot and correction status are kept together.</p>:keepsReference?<p>Editing keeps this finding’s saved slide reference. To comment on the slide currently open, add another finding.</p>:<p>The reference follows the slide currently open in the presentation, including slides containing activities and quizzes.</p>}

 <fieldset><legend>Categories — select all that apply</legend>{categories.map((category,index)=><div key={index}><label>Category {index+1}<select name="category" value={category} onChange={e=>setCategories(current=>current.map((v,i)=>i===index?e.target.value:v))}>{[...new Set([...options,category])].map(o=><option key={o}>{o}</option>)}</select></label>{category==="Other"?<label>Another category<input name="custom_category" required maxLength={80}/></label>:null}{index>0?<button type="button" className="secondary-button" onClick={()=>setCategories(current=>current.filter((_,i)=>i!==index))}>Remove category {index+1}</button>:null}</div>)}<button type="button" className="secondary-button" disabled={categories.length>=10} onClick={()=>setCategories(current=>[...current,"Content"])}>Add another category</button></fieldset>

 <label><input name="blocking" type="checkbox" checked={blocking} disabled={choices.issueDisabled&&!blocking} onChange={e=>{setBlocking(e.target.checked);if(e.target.checked)setHasIssue(true);}}/> Blocks publication until fixed and verified</label>

 <label>Comments / requested changes (optional explanation)<textarea name="comment" value={comment} onChange={e=>setComment(e.target.value)} maxLength={5000}/></label>

 {selected?.attachment?<p><a href={`/course-reviews/${id}/evidence/${selected.id}`} target="_blank" rel="noreferrer">View saved screenshot</a>. It is retained unless you upload a new image; earlier images remain in the audit trail.</p>:null}

 <ReviewScreenshot/>

 {!isIssue?<p>Your selected declarations and any comments or image attachment will be saved together. Confirm complete LU/quiz coverage separately after reviewing the entire unit.</p>:null}{message?<p role="status">{message}</p>:null}

 </ReviewForm></>:<p>{disabledReason??"This review is closed or overdue. Ask for an extension in the team workspace."}</p>}

 </div>

 <dialog className="review-dialog" ref={reopen} aria-label="Edit saved review"><h2>You already reviewed this learning unit</h2><p>Would you like to edit your saved review? Your latest saved finding will be displayed. You can select any of your other findings in the editor.</p><button className="primary-button" onClick={()=>{load(latest);reopen.current?.close();}}>Yes — edit my saved review</button><button className="secondary-button" onClick={()=>{load();reopen.current?.close();}}>Add another finding — keep all responses</button><button className="secondary-button" onClick={()=>reopen.current?.close()}>Cancel</button></dialog>

 <dialog className="review-dialog" ref={replacement} aria-label="Keep or edit saved review feedback"><h2>You already reviewed this reference</h2><p>You may keep all review responses as separate findings, or edit your previous feedback. The earlier version, discussion and screenshot remain in the audit trail.</p>

 <button className="primary-button" onClick={()=>{const form=pendingForm.current,input=form?.elements.namedItem("keep_all") as HTMLInputElement|null;if(input&&form){input.value="yes";replacement.current?.close();form.requestSubmit();}}}>Keep all review findings — save this as another</button>

 <button className="secondary-button" onClick={()=>{load(editableFindings.find(f=>f.id===replacementId.current));replacement.current?.close();}}>Edit my previous feedback</button><button className="secondary-button" onClick={()=>replacement.current?.close()}>Cancel</button></dialog>

 </aside>;

}

