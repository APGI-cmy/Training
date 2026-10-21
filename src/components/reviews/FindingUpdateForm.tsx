"use client";

import {useState} from "react";
import {ReviewForm} from "./ReviewForms";

type Update="reply"|"fixed"|"close";
export function FindingUpdateForm({id,findingId,canFix,canVerify}:{id:string;findingId:string;canFix:boolean;canVerify:boolean}) {
 const [operation,setOperation]=useState<Update>("reply");
 return <ReviewForm id={id} operation={operation} hidden={{finding_id:findingId}} label="Save selected update">
  <label>Finding update<select value={operation} onChange={e=>setOperation(e.target.value as Update)}>
   <option value="reply">Discussion only — leave status unchanged</option>
   {canFix?<option value="fixed">Changes implemented — request independent verification</option>:null}
   {canVerify?<option value="close">Independently verified — close finding</option>:null}
  </select></label>
  <p role="status">{operation==="reply"?"This adds to the discussion. It does not mark this finding fixed or closed.":operation==="fixed"?"You declare that the correction is implemented in this deployed version. Status becomes fixed, awaiting a different reviewer's verification.":"You declare that you inspected the correction in this deployed version. Status becomes closed. You cannot verify your own fix."}</p>
  <label>Explanation (optional)<textarea name="comment" maxLength={5000}/></label>
 </ReviewForm>;
}
