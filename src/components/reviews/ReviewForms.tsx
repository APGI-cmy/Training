"use client";
import {useActionState,useId,useState,useEffect} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import type {FormEvent} from "react";
import {courseReviewAction,createCourseReview,type ReviewActionState} from "@/server/actions/course-reviews";
import {publicationWorkflowAction} from "@/server/actions/publication-workflow";
import type {ReactNode} from "react";
export const reviewThanks="Thank you for your feedback. Your feedback, together with feedback from the other reviewers, will be considered in the final version. You may be requested to review again after the material is updated.";
export async function submitReviewFeedback(action:(previous:ReviewActionState,form:FormData)=>Promise<ReviewActionState>,previous:ReviewActionState,form:FormData,acknowledge:boolean,notify:(message:string)=>void,navigate:(href:string)=>void){
 const result=await action(previous,form);
 // Run from the submitted action's closure: approval/report completion may unmount its form.
 if(result.success){if(acknowledge)notify(reviewThanks);if(result.href)navigate(result.href);}
 return result;
}
export function ReviewForm({id,operation,children,label="Save",hidden={},disabled=false,workflow=false,acknowledge=false,preserveFields=false,beforeSubmit}:{id:string;operation:string;children?:ReactNode;label?:string;hidden?:Record<string,string>;disabled?:boolean;workflow?:boolean;acknowledge?:boolean;preserveFields?:boolean;beforeSubmit?:(event:FormEvent<HTMLFormElement>)=>void}){
 const router=useRouter();
 const [state,action,pending]=useActionState<ReviewActionState,FormData>((previous,form)=>submitReviewFeedback(workflow?publicationWorkflowAction:courseReviewAction,previous,form,acknowledge,message=>window.alert(message),href=>router.push(href)),{});
 const [toast,setToast]=useState(false);
 useEffect(()=>{if(state.success){router.refresh();setToast(true);const timer=setTimeout(()=>setToast(false),6000);return ()=>clearTimeout(timer);}},[state,router]);
 return <><form action={action} onReset={preserveFields?event=>event.preventDefault():undefined} onSubmit={beforeSubmit} className="review-form"><input type="hidden" name="round_id" value={id}/><input type="hidden" name="operation" value={operation}/>{Object.entries(hidden).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}{children}<button className="primary-button" disabled={pending||disabled}>{pending?"Saving…":label}</button>{state.error?<p className="form-error" role="alert">{state.error}</p>:null}{state.success?<>{!toast?<p className="form-success" role="status">{state.success}</p>:null}{toast?<div className="review-toast" role="status">{state.success}</div>:null}</>:null}</form></>;
}
export function CoverageConfirmation({id,unit,confirmed,locked=false}:{id:string;unit:string;confirmed:boolean;locked?:boolean}){
 const [checked,setChecked]=useState(false);
 return <ReviewForm id={id} operation="coverage" label={confirmed?"Coverage saved":"Confirm coverage"} disabled={confirmed||locked} hidden={{unit}}><label><input key={confirmed?"saved":"draft"} type="checkbox" name="confirm_coverage" required checked={confirmed||checked} disabled={confirmed||locked} onChange={e=>setChecked(e.target.checked)}/> I reviewed this entire LU, including its quizzes and tests.</label>{confirmed?<p className="form-success">Confirmed and saved. This remains recorded when you return.</p>:null}</ReviewForm>;
}
export function RequestReviewForm({courseId,email,companies,initialBrand="",initialCredits={}}:{courseId:string;email:string;companies:{id:string;name:string;slug:string}[];initialBrand?:string;initialCredits?:Record<string,string>}){
 const [brandId,setBrandId]=useState(initialBrand||companies.find(c=>c.slug==="apgi")?.id||"");const brandIsApgi=companies.find(c=>c.id===brandId)?.slug==="apgi";
 const [state,action,pending]=useActionState<ReviewActionState,FormData>(createCourseReview,{}),prefix=useId();
 const [people,setPeople]=useState(()=>[{id:0,email,role:"primary",scope:"content_and_commercials"},{id:1,email:brandIsApgi?(email==="johan.ras@apginc.ca"?"jorrie.jordaan@apginc.ca":"johan.ras@apginc.ca"):"",role:"primary",scope:brandIsApgi?"content_and_commercials":"content"}]);
 const [next,setNext]=useState(2),[restored,setRestored]=useState(false);
 const setupKey=`apgi-content-review-setup:${email}:${courseId}`;
 const [metadata,setMetadata]=useState({rights_holder:initialCredits.rights_holder||brandId,designer_name:initialCredits.designer_name||"",designer_company:initialCredits.designer_company||"",terms_acceptor:""});
 const apgi=brandIsApgi&&companies.find(c=>c.id===metadata.rights_holder)?.slug==="apgi";
 const [cutoff,setCutoff]=useState(new Date(Date.now()+7*86400000+7200000).toISOString().slice(0,16));
 useEffect(()=>{try{const raw=sessionStorage.getItem(setupKey);if(raw){const saved=JSON.parse(raw);if(Date.now()-Number(saved.time)<86400000){if(saved.metadata)setMetadata(current=>({...current,...saved.metadata}));if(Array.isArray(saved.people)&&saved.people.length>=2){setPeople(saved.people.map((p:{scope?:string})=>({...p,scope:p.scope||"content"})));setNext(Math.max(...saved.people.map((p:{id:number})=>p.id))+1);}if(typeof saved.cutoff==="string")setCutoff(saved.cutoff);if(!initialBrand&&companies.some(c=>c.id===saved.brandId))setBrandId(saved.brandId);}}}catch{/* Setup remains usable without tab storage. */}setRestored(true);
 // Restore once for this principal/course. The returned brand query takes precedence.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[setupKey]);
 useEffect(()=>{if(restored)try{sessionStorage.setItem(setupKey,JSON.stringify({time:Date.now(),metadata,people,cutoff,brandId}));}catch{}},[restored,setupKey,metadata,people,cutoff,brandId]);

 return <form action={action} className="review-form"><input name="course_id" type="hidden" value={courseId}/><label>Publishing brand<select name="organisation_id" value={brandId} onChange={e=>setBrandId(e.target.value)} required>{companies.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Current legal course owner<select name="rights_holder" required value={metadata.rights_holder} onChange={e=>setMetadata(current=>({...current,rights_holder:e.target.value}))}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Course designer name<input name="designer_name" value={metadata.designer_name} onChange={e=>setMetadata(current=>({...current,designer_name:e.target.value}))} required minLength={2} maxLength={180}/></label><label>Course designer company<input name="designer_company" value={metadata.designer_company} onChange={e=>setMetadata(current=>({...current,designer_company:e.target.value}))} required minLength={2} maxLength={180}/></label><p>At least two full reviewers, including you. Each full report needs one different reviewer's endorsement. Add optional peer checkers as needed.</p>
 {people.map((p,i)=><div className="review-person-row" key={p.id}><label htmlFor={`${prefix}-${p.id}`}>Reviewer {i+1}<input id={`${prefix}-${p.id}`} name="review_email" type="email" required value={p.email} maxLength={254} onChange={e=>setPeople(current=>current.map(x=>x.id===p.id?{...x,email:e.target.value}:x))}/></label><label>Review role<select name="review_role" value={p.role} onChange={e=>setPeople(current=>current.map(x=>x.id===p.id?{...x,role:e.target.value}:x))}><option value="primary">Full review and peer endorsement</option><option value="peer">Peer report checker only</option></select></label><label><input type="hidden" name="review_scope" value={p.scope}/><input type="checkbox" checked={p.scope==="content_and_commercials"} onChange={e=>setPeople(current=>current.map(x=>x.id===p.id?{...x,scope:e.target.checked?"content_and_commercials":"content"}:x))}/> Also review commercials<small>Otherwise content only. This does not grant APGI administrator rights or replace the required Johan/Jorrie sign-offs.</small></label>{i>1?<button type="button" className="secondary-button" onClick={()=>setPeople(current=>current.filter(x=>x.id!==p.id))}>Remove reviewer</button>:null}</div>)}
 <button type="button" className="secondary-button" onClick={()=>{setPeople(current=>[...current,{id:next,email:"",role:"primary",scope:"content"}]);setNext(n=>n+1);}}>Add a reviewer</button>
 <label>Cutoff — South African time (Africa/Johannesburg)<input name="cutoff" type="datetime-local" required value={cutoff} onChange={e=>setCutoff(e.target.value)}/></label>
 {!apgi?<label>Company owner's email for commercial acceptance<input type="email" name="terms_acceptor" value={metadata.terms_acceptor} onChange={e=>setMetadata(current=>({...current,terms_acceptor:e.target.value}))} required/><small>This person will receive a company-scoped onboarding offer only after both APGI principals approve commercials. They may also be a content reviewer, but are not required in this initial team.</small></label>:null}
 <p>Daily reminders are scheduled for 09:00 South African time. They stop when a reviewer finishes, declines or reaches the cutoff. Unfinished work becomes overdue and requires an extension. The requester receives a progress digest.</p>
 <button className="primary-button" disabled={pending||!!state.href}>{pending?"Requesting…":"Request review and email the team"}</button>{state.error?<p role="alert" className="form-error">{state.error}</p>:null}{state.success?<p role="status">{state.success}</p>:null}{state.href?<Link className="primary-button" href={state.href}>Continue to team review</Link>:null}</form>;
}
