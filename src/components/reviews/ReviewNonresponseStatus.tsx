import type {ReviewRound} from '@/lib/course-review';
import {reviewNonresponseNotice,deemedEntryAppliesToUnit} from '@/lib/review-nonresponse';
export function ReviewNonresponseStatus({round,unit}:{round:ReviewRound;unit?:string}){
 if(round.document.nonresponsePolicy?.version!==1)return null;
 const entries=(round.document.deemedEndorsements??[]).filter(e=>round.document.units.some(u=>(!unit||u.slug===unit)&&deemedEntryAppliesToUnit(round,e,u.slug)));
 const stamp=(at:string)=>new Date(at).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})+' SAST';
 return <section aria-label="Seven-day content response policy"><details><summary>Seven-day content response rule</summary><p>{reviewNonresponseNotice}</p><p>Reading an email or recording a read receipt alone is not a response. Timer results are processed hourly. A failed or unsent notice cannot produce an automatic endorsement.</p></details>{entries.length?<div className="lu-pending" role="status"><strong>Deemed endorsement — no response</strong><p>The system applied the notified seven-day rule. This is distinct from an actual review or personal approval; coverage checkboxes and human endorsement records remain unchanged.</p><ul>{entries.map(e=><li key={e.requestId}>{e.recipient}: {e.kind==='initial'?'initial course review':'content endorsement request'} · due {stamp(e.dueAt)} · deemed {stamp(e.at)}.</li>)}</ul></div>:null}</section>;
}
