import type {ReviewDocument,ReviewPerson,ReviewRound} from "./course-review";
export const reviewTaskLabels={content:"Content",commercials:"Commercials",branding:"Branding"} as const;
export type ReviewTask=keyof typeof reviewTaskLabels;
export type TaskDecision={id:string;task:"branding"|"commercials";target:string;email:string;userId:string;at:string;decision:"approve"|"changes";comment:string};
export function assignedTasks(person:Pick<ReviewPerson,"tasks"|"scope"|"role">):ReviewTask[]{
 return person.tasks??(person.role==="partner"?[]:person.scope==="content_and_commercials"?["content","commercials"]:["content"]);
}
export const hasReviewTask=(person:ReviewPerson,task:ReviewTask)=>assignedTasks(person).includes(task);
export function selectedTasks(values:string[]):ReviewTask[]{
 if(!values.length||values.some(v=>!Object.hasOwn(reviewTaskLabels,v)))throw Error("Assign at least one of content, commercials or branding.");
 return (Object.keys(reviewTaskLabels) as ReviewTask[]).filter(t=>values.includes(t));
}
export const taskDecision=(d:ReviewDocument,email:string,task:TaskDecision["task"],target:string)=>d.taskDecisions?.filter(x=>x.email===email&&x.task===task&&x.target===target).at(-1);
export function commercialReviewApproved(d:ReviewDocument,email:string,userId?:string){
 const v=d.workflow?.commercials.at(-1);if(!v||!userId)return false;
 const decision=taskDecision(d,email,"commercials",v.id);
 if(decision)return decision.decision==="approve"&&decision.userId===userId;
 return v.decisions.some(x=>x.email===email&&x.userId===userId&&x.decision==="approve")||!!v.acceptance&&v.acceptance.email===email&&v.acceptance.userId===userId;
}
export function companyBrandApproved(round:ReviewRound,brandRevision:number){
 const w=round.document.workflow;if(!w?.partner)return true;
 const decision=taskDecision(round.document,w.partnerEmail,"branding",String(brandRevision));
 if(decision)return decision.decision==="approve";
 const acceptance=w.commercials.at(-1)?.acceptance;
 return !!acceptance&&acceptance.email===w.partnerEmail&&acceptance.brandRevision===brandRevision;
}
export function reviewTaskBlockers(round:ReviewRound,brandRevision:number){
 const d=round.document,v=d.workflow?.commercials.at(-1),reasons:string[]=[];
 for(const p of d.participants.filter(p=>p.state!=="declined"))for(const task of p.tasks??[]){
  if(task==="content")continue;
  if(task==="commercials"&&commercialReviewApproved(d,p.email,p.userId))continue;
  const target=task==="branding"?String(brandRevision):v?.id;
  const decision=target?taskDecision(d,p.email,task,target):undefined;
  if(!decision||decision.decision!=="approve"||decision.userId!==p.userId)reasons.push(`${p.email}: current ${task} review approval outstanding.`);
 }
 if(d.workflow?.partner&&!companyBrandApproved(round,brandRevision))reasons.push("The company owner must explicitly approve the current branding revision.");
 return reasons;
}
export function outstandingAssignedTasks(round:ReviewRound,p:ReviewPerson,brandRevision=round.document.brand.revision){
 const v=round.document.workflow?.commercials.at(-1);
 return assignedTasks(p).filter(task=>task==="content"?p.state!=="finished":
  // Legacy commercial scope was advisory. Existing reports retain their meaning.
  !p.tasks?false:task==="commercials"?!commercialReviewApproved(round.document,p.email,p.userId):taskDecision(round.document,p.email,task,String(brandRevision))?.decision!=="approve");
}
