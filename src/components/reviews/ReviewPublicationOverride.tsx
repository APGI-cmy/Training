'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ReviewForm} from './ReviewForms';

export function ReviewPublicationOverride({id,revision,fingerprint,brandRevision}:{id:string;revision:number;fingerprint:string;brandRevision:number}){
 const dialog=useRef<HTMLDialogElement>(null),heading=useId();
 const [mode,setMode]=useState<'clear'|'retain'>('retain');
 useEffect(()=>{dialog.current?.close();},[revision]);
 function open(choice:'clear'|'retain'){setMode(choice);dialog.current?.showModal();}
 return <div className="publication-review-override">
  <p>Publish before the reviews finish: choose an override for all three review workflows. A reason and confirmation are required.</p>
  <button className="secondary-button" type="button" onClick={()=>open('clear')}>Override and discard review</button>{' '}
  <button className="secondary-button" type="button" onClick={()=>open('retain')}>Override but retain review process</button>
  <dialog ref={dialog} className="review-dialog" aria-labelledby={heading}>
   <h3 id={heading}>Are you sure you want to override the review process?</h3>
   <p>This applies to content, commercial and branding reviews for this exact saved version. Publication remains a separate action. Prices, learner assessment requirements and payment settings stay unchanged.</p>
   <ReviewForm id={id} operation="review_override" hidden={{scope:'all',expected_revision:String(revision),expected_fingerprint:fingerprint,brand_revision:String(brandRevision)}} label="Confirm review override">
    <label>Override option<select name="mode" value={mode} onChange={e=>setMode(e.target.value as 'clear'|'retain')}>
     <option value="clear">1. Override and discard review</option>
     <option value="retain">2. Override but retain review process</option>
    </select></label>
    <p>{mode==='clear'?'All active review steps become green. Earlier evidence is archived for audit and can be restored by removing the override.':'Outstanding review steps remain visible and can still be completed. Publishing creates a frozen learner release while the original review stays open.'}</p>
    <label>Reason for the override<textarea name="reason" required minLength={15} maxLength={4000}/></label>
    <label><input name="confirm_override" type="checkbox" required/> Yes, override the review process using this option and reason.</label>
   </ReviewForm>
   <button type="button" className="secondary-button" onClick={()=>dialog.current?.close()}>Cancel / close</button>
  </dialog>
 </div>;
}
