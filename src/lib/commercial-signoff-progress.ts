export type CommercialSignoffRecord={
 id:string;
 batch_id:string;
 fingerprint:string;
 reviewer_email:string;
 state:'open'|'responded'|'closed';
 cycle:number;
 superseded_by:string|null;
 decisions:Record<string,'approve'|'changes'>|null;
 response_email:string|null;
 response_cycle:number|null;
};

export function commercialSignoffProgress(records:readonly CommercialSignoffRecord[]){
 const current=records.find(r=>!r.superseded_by&&r.fingerprint);
 if(!current)return null;
 const exact=records.filter(r=>!r.superseded_by&&r.batch_id===current.batch_id&&r.fingerprint===current.fingerprint);
 const assignments=exact.map(r=>{
  const signed=r.state!=='open'&&r.response_email===r.reviewer_email&&r.response_cycle===r.cycle;
  const decision=r.decisions?.['course-pricing'];
  return {id:r.id,email:r.reviewer_email,approved:signed&&decision==='approve',changes:signed&&decision==='changes',closed:r.state==='closed'};
 });
 const approved=assignments.filter(a=>a.approved).length;
 // A mixed or repeated batch can never count as unanimous.
 const complete=approved===assignments.length&&assignments.length===records.filter(r=>!r.superseded_by&&r.batch_id===current.batch_id).length
  &&new Set(assignments.map(a=>a.email)).size===assignments.length;
 return {batch:current.batch_id,assignments,approved,total:assignments.length,complete};
}

export type CommercialSignoffProgress=NonNullable<ReturnType<typeof commercialSignoffProgress>>;
export const commercialSignoffLabel=(progress:CommercialSignoffProgress)=>`${progress.approved} of ${progress.total} commercial sign-offs recorded`;
