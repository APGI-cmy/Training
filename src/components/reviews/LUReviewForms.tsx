'use client';
import {useEffect,useRef,useState} from 'react';
import {ReviewForm} from './ReviewForms';
import {currentImplementation,implementationRounds,type ImplementationRound} from '@/lib/lu-review-workflow';
import type {ReviewFinding,ReviewRound} from '@/lib/course-review';
export function ImplementationEditor({round,finding,userId}:{round:ReviewRound;finding:ReviewFinding;userId:string}){
 const response=currentImplementation(round,finding),key=`apgi-implementation:${round.id}:${finding.id}:${finding.at}:${response?.id??'first'}:${userId}`;
 const [implemented,setImplemented]=useState(''),[notes,setNotes]=useState(''),[saved,setSaved]=useState(false),[ready,setReady]=useState(false),box=useRef<HTMLDivElement>(null);
 useEffect(()=>{setImplemented('');setNotes('');setSaved(false);try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d){setImplemented(d.implemented??'');setNotes(d.notes??'');setSaved(true);}}catch{}setReady(true);},[key]);
 const number=(implementationRounds(round,finding).at(-1)?.number??0)+1;
 const save=()=>{try{localStorage.setItem(key,JSON.stringify({implemented,notes}));setSaved(true);}catch{setSaved(false);}};
 return <div className="lu-implementation-editor" ref={box}><h4>{response?'Respond to the reopened finding':'Record the first implementation response'}</h4><p>Private draft on this device. Only submitting creates a numbered response for the reviewer.</p><ReviewForm key={key} id={round.id} operation="implementation_submit" preserveFields disabled={!ready} hidden={{finding_id:finding.id,finding_at:finding.at,response_id:response?.id??''}} label={`Submit implementation (${number})`}>
 <fieldset><legend>Finding implemented?</legend><label><input type="radio" name="implemented" value="yes" required checked={implemented==='yes'} onChange={()=>setImplemented('yes')}/> Yes — correction implemented</label><label><input type="radio" name="implemented" value="no" required checked={implemented==='no'} onChange={()=>setImplemented('no')}/> No — propose no change and explain why</label></fieldset>
 <label>Implementation feedback / reason<textarea name="comment" required minLength={5} maxLength={5000} value={notes} onChange={e=>{setNotes(e.target.value);setSaved(false);}}/></label><button type="button" className="secondary-button" onClick={save}>Save private draft</button>{saved?<p role="status">Private draft saved. Reviewer views are unchanged.</p>:null}
 </ReviewForm></div>;
}
export function FindingDecisionForm({round,finding,response,endorsement=false}:{round:ReviewRound;finding:ReviewFinding;response?:ImplementationRound;endorsement?:boolean}){
 const [choice,setChoice]=useState('');
 return <ReviewForm key={`${finding.id}:${response?.id??finding.at}:${endorsement}`} id={round.id} operation={endorsement?'finding_endorsement':'implementation_decision'} preserveFields hidden={{finding_id:finding.id,finding_at:finding.at,response_id:response?.id??''}} label={endorsement?'Submit endorsement decision':`Submit decision on response (${response!.number})`}>
 <h4>{endorsement?'Endorse this reviewer’s submitted record':`Your decision on the designer’s response (${response!.number})`}</h4>
 <label><input type="radio" name="decision" value={endorsement?'yes':'accept'} required checked={choice===(endorsement?'yes':'accept')} onChange={e=>setChoice(e.target.value)}/>{endorsement?'Yes — endorse':`Yes — accept response (${response!.number}) and close this response loop`}</label>
 <label><input type="radio" name="decision" value={endorsement?'no':'reopen'} required checked={choice===(endorsement?'no':'reopen')} onChange={e=>setChoice(e.target.value)}/>{endorsement?'No — do not endorse':`No — reject response (${response!.number}) and reopen this finding`}</label>
 <label>{endorsement?'Comments / reason for not endorsing':'Comments / reason for reopening'}<textarea name="comment" required={choice==='no'||choice==='reopen'} minLength={choice==='no'||choice==='reopen'?5:undefined} maxLength={5000}/></label>
 <p>{endorsement?'One additional endorsement is sufficient. A No decision requires a reason and reopens the record for correction, without requiring you to monitor someone else’s feedback loop.':`This decision applies only to Implementation notes (${response!.number}). There is no self-endorsement step.`}</p>
 </ReviewForm>;
}
