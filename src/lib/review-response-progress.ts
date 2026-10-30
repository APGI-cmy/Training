import type {ReviewRound} from './course-review';
import {currentImplementation,designerEmail} from './lu-review-workflow';
import {reviewResponseRequests} from './review-nonresponse';
export type ResponseTrackingRow={request_key:string;state:string;notified_at:string|null;due_at:string|null};
export function reviewResponseProgress(round:ReviewRound,saved:ResponseTrackingRow[],viewer:string){
 const byKey=new Map(saved.map(r=>[r.request_key,r]));
 return reviewResponseRequests(round).filter(r=>r.kind==='endorsement').flatMap(request=>{
  const finding=round.document.findings.find(f=>f.id===request.findingId);if(!finding)return [];
  if(![request.recipient,finding.author,currentImplementation(round,finding)?.email,round.document.requester,designerEmail(round.document)].includes(viewer))return [];
  const row=byKey.get(request.key);
  return [{key:request.key,findingId:finding.id,unit:finding.unit,reference:finding.reference,recipient:request.recipient,
   state:row?.state??'unregistered',notifiedAt:row?.notified_at??null,dueAt:row?.due_at??null}];
 });
}
export type ReviewResponseProgress=ReturnType<typeof reviewResponseProgress>;
