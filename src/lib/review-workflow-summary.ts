import type {ReviewRound} from './course-review';
import {reviewCleared} from './review-overrides';

export type ReviewOffering={organisation_id:string;course_id:string;status:string;reviewed_release_id:string|null};
export type ReviewWorkflowSummary={key:string;current:ReviewRound;openReview?:ReviewRound;publishedRelease?:ReviewRound;published:boolean|null;reviewContinuing:boolean;history:ReviewRound[]};

// A release snapshot is evidence of a publication, not another active workflow.
// Group only records already visible to the caller; never widen review access.
export function summarizeReviewWorkflows(rounds:ReviewRound[],offerings:ReviewOffering[]|null):ReviewWorkflowSummary[]{
 const groups=new Map<string,ReviewRound[]>();
 for(const round of rounds){const key=`${round.organisation_id}:${round.course_id}`;groups.set(key,[...(groups.get(key)??[]),round]);}
 return [...groups].map(([key,group])=>{
  const records=[...group].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||b.id.localeCompare(a.id));
  const offering=offerings?.find(o=>`${o.organisation_id}:${o.course_id}`===key);
  const releaseId=offering?.status==='published'?offering.reviewed_release_id:null;
  const publishedRelease=records.find(r=>r.id===releaseId&&r.status==='published');
  const open=records.filter(r=>r.status==='open');
  const openReview=open.find(r=>r.id===publishedRelease?.document.sourceReviewId)??open[0];
  const current=openReview??publishedRelease??records[0];
  const cleared=!!openReview&&(['content','commercials','branding'] as const).every(scope=>reviewCleared(openReview,scope));
  return {key,current,openReview,publishedRelease,published:offerings===null?null:!!releaseId,reviewContinuing:!!openReview&&!cleared,history:records.filter(r=>r.id!==current.id&&r.id!==publishedRelease?.id)};
 });
}
