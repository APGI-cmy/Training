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
export function FindingDecisionForm({round,finding,response}:{round:ReviewRound;finding:ReviewFinding;response?:ImplementationRound}){
 const [choice,setChoice]=useState('');
 return <ReviewForm key={`${finding.id}:${response?.id??finding.at}`} id={round.id} operation="finding_endorsement" preserveFields hidden={{finding_id:finding.id,finding_at:finding.at,response_id:response?.id??''}} label="Submit endorsement decision">
 <h4>{response?`Endorse Implementation notes (${response.number})`:'Endorse this review declaration'}</h4>
 <label><input type="radio" name="decision" value="yes" required checked={choice==='yes'} onChange={e=>setChoice(e.target.value)}/>Yes — endorse and close</label>
 <label><input type="radio" name="decision" value="no" required checked={choice==='no'} onChange={e=>setChoice(e.target.value)}/>No — do not endorse; reopen with a reason</label>
 <label>Comments / reason for not endorsing<textarea name="comment" required={choice==='no'} minLength={choice==='no'?5:undefined} maxLength={5000}/></label>
 <p>One additional endorsement is sufficient. No requires a reason and reopens the record for correction. The implementation writer cannot endorse their own response; a declaration’s author cannot endorse their own declaration.</p>
 </ReviewForm>;
}
