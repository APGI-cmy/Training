"use client";
import {useActionState,useId,useState} from "react";
import Link from "next/link";
import {courseReviewAction,createCourseReview,type ReviewActionState} from "@/server/actions/course-reviews";
import type {ReactNode} from "react";
export function ReviewForm({id,operation,children,label="Save",hidden={}}:{id:string;operation:string;children?:ReactNode;label?:string;hidden?:Record<string,string>}){
 const [state,action,pending]=useActionState<ReviewActionState,FormData>(courseReviewAction,{});
 return <form action={action} className="review-form"><input type="hidden" name="round_id" value={id}/><input type="hidden" name="operation" value={operation}/>{Object.entries(hidden).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}{children}<button className="primary-button" disabled={pending}>{pending?"Saving…":label}</button>{state.error?<p className="form-error" role="alert">{state.error}</p>:null}{state.success?<p className="form-success" role="status">{state.success}</p>:null}</form>;
}
export function RequestReviewForm({planId,email,apgi}:{planId:string;email:string;apgi:boolean}){
 const [state,action,pending]=useActionState<ReviewActionState,FormData>(createCourseReview,{}),prefix=useId();
 const [people,setPeople]=useState(()=>[{id:0,email,role:"primary"},{id:1,email:apgi?(email==="johan.ras@apginc.ca"?"jorrie.jordaan@apginc.ca":"johan.ras@apginc.ca"):"",role:"primary"}]);
 const [next,setNext]=useState(2);
 const defaultCutoff=new Date(Date.now()+7*86400000+7200000).toISOString().slice(0,16);
 return <form action={action} className="review-form"><input name="plan_id" type="hidden" value={planId}/><p>At least two full reviewers, including you. Each full report needs one different reviewer's endorsement. Add optional peer checkers as needed.</p>
 {people.map((p,i)=><div className="review-person-row" key={p.id}><label htmlFor={`${prefix}-${p.id}`}>Reviewer {i+1}<input id={`${prefix}-${p.id}`} name="review_email" type="email" required value={p.email} maxLength={254} onChange={e=>setPeople(current=>current.map(x=>x.id===p.id?{...x,email:e.target.value}:x))}/></label><label>Review role<select name="review_role" value={p.role} onChange={e=>setPeople(current=>current.map(x=>x.id===p.id?{...x,role:e.target.value}:x))}><option value="primary">Full review and peer endorsement</option><option value="peer">Peer report checker only</option></select></label>{i>1?<button type="button" className="secondary-button" onClick={()=>setPeople(current=>current.filter(x=>x.id!==p.id))}>Remove reviewer</button>:null}</div>)}
 <button type="button" className="secondary-button" onClick={()=>{setPeople(current=>[...current,{id:next,email:"",role:"primary"}]);setNext(n=>n+1);}}>Add a reviewer</button>
 <label>Cutoff — South African time (Africa/Johannesburg)<input name="cutoff" type="datetime-local" required defaultValue={defaultCutoff}/></label>
 {!apgi?<label>Company owner's email for commercial acceptance<input type="email" name="terms_acceptor" required/><small>This person must be in the team and appointed as the company's business owner. Content review does not accept commercial terms.</small></label>:null}
 <p>Daily reminders are scheduled for 09:00 South African time. They stop when a reviewer finishes, declines or reaches the cutoff. Unfinished work becomes overdue and requires an extension. The requester receives a progress digest.</p>
 <button className="primary-button" disabled={pending||!!state.href}>{pending?"Requesting…":"Request review and email the team"}</button>{state.error?<p role="alert" className="form-error">{state.error}</p>:null}{state.success?<p role="status">{state.success}</p>:null}{state.href?<Link className="primary-button" href={state.href}>Continue to team review</Link>:null}</form>;
}
