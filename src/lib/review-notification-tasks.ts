import {canImplement,canEndorseFinding,currentImplementation,findingPhase,isCourseDesigner} from "./lu-review-workflow";
import {activeFindings,canWork,currentReport,contentReviewBlockers,reviewBlockers,type ReviewRound} from "./course-review";
import {hasReviewTask,taskDecision,commercialReviewApproved,companyBrandApproved} from "./review-tasks";
import {bothCommercialApprovals} from "./publication-workflow";
import {commercialReviewPath,commercialSignoffAnchor,reportAnchor} from "./review-navigation";
import {deemedReviewCoversUnit} from './review-nonresponse';
export type ReviewNotificationTask={key:string;roundId:string;revision:number;title:string;requirement:string;path:string;anchor:string;version:string;actorUserId?:string;unit?:string};
export type ReviewTaskSource={round:ReviewRound;hash:string;brandRevision:number};
export function reviewNotificationTasks({round:r,hash,brandRevision}:ReviewTaskSource,email:string,userId:string,principal:boolean):ReviewNotificationTask[]{
 const d=r.document,w=d.workflow,v=w?.commercials.at(-1),p=d.participants.find(p=>p.email===email),base=`/course-reviews/${r.id}`,commercial=commercialReviewPath(r.id),fresh=hash===r.fingerprint;
 if(r.status!=="open"||!w||!principal&&(!p||p.state==="declined"))return [];
 const tasks:ReviewNotificationTask[]=[];
 const add=(kind:string,version:string,title:string,requirement:string,anchor:string,path=base)=>tasks.push({key:`review-action:${r.id}:${kind}:${version}`,roundId:r.id,revision:r.revision,title:`${title} — ${d.title}`,requirement,path,anchor,version,actorUserId:d.requesterId});
 if(!fresh&&principal)add("deployment",hash,"Register the corrected course deployment","The deployed content differs from the recorded review. Check the corrections, register this deployment and confirm the review cutoff. This does not approve content.","changes-implemented");
 if(!canWork(r)){
  add("extension",d.cutoff,principal?"Review deadline passed — decide on an extension":"Request an extension to continue reviewing","The cutoff has passed. Work cannot continue until the requester approves an extension; overdue work never counts as approval.","manage-request");return tasks;
 }
 if(d.reviewProcessVersion===3&&fresh){
  for(const u of d.units)if(p?.role==="primary"&&hasReviewTask(p,"content")&&p.state!=="declined"&&!deemedReviewCoversUnit(r,email,u.slug)&&(!p.coverage.includes(u.slug)||!activeFindings(d).some(f=>f.author===email&&(f.unit===u.slug||f.scope==="course"))))add("lu-initial",`${u.slug}:${r.fingerprint}`,"Complete the LU initial review",`${u.title}: open the presentation, save a finding or nothing-to-add declaration and confirm your LU review.`,`review-unit-${u.slug}`);
  for(const f of activeFindings(d)){
   const response=currentImplementation(r,f),phase=findingPhase(r,f),version=`${f.id}:${f.at}:${response?.id??"first"}:${phase}`;
   const unit=d.units.find(u=>u.slug===f.unit),label=`${f.unit.toUpperCase()} · ${unit?.title??f.reference}`;
   const guide=(...steps:string[])=>steps.map((step,index)=>`${index+1}. ${step}`).join('\n');
   const recheck=[`Open ${f.unit.toUpperCase()} and review the presentation and quizzes.`,...(p?.role==='primary'&&!p.coverage.includes(f.unit)?['After checking, confirm “I reviewed this entire LU, including its quizzes and tests.”']:[])];
   const findingTask=(kind:string,title:string,requirement:string,actorUserId:string)=>{add(kind,version,title,requirement,`finding-${f.id}`);Object.assign(tasks[tasks.length-1],{actorUserId,unit:f.scope==='course'?'*':f.unit});};
   if(canImplement(r,f,email,userId))findingTask("lu-implementation","Respond to a review finding",`${label}: ${phase==='Reopened'?"This finding was reopened. Read the rejection reason, make the next correction and submit the next numbered implementation response.":"Read the requested change. Implement the correction and submit Implementation notes (1), or explain why no change is proposed."}`,f.userId);
   if(canEndorseFinding(r,f,email,userId))findingTask("lu-endorsement",response?"Review and endorse the designer’s implementation":"Endorse a completed reviewer record",`${label}\n\n${response?`${response.email} submitted Implementation notes (${response.number})${f.author===email?' for the change you requested':''}. Implementation feedback is recorded; your decision is made directly under Endorsements.`:`${f.author} submitted a review declaration for independent endorsement.`}\n\n${guide(...recheck,'Open this LU review workflow → Endorsements.',`Read the record and ${response?`Implementation notes (${response.number})`:'the review declaration'}, then choose Yes—endorse and close or No—do not endorse and reopen.`)}\n\nOne additional endorsement is sufficient, even when the team has five or more reviewers. No requires a reason and returns the record for correction. Your earlier comments remain saved.`,response?.userId??f.userId);
   if(f.outcome==='satisfied'&&phase==='Reopened'&&f.author===email&&f.userId===userId)findingTask("lu-revise-declaration","Revise your review declaration",`${label}: another reviewer declined endorsement. Read their reason in Reopened rounds, open the LU and update your saved review. A revised declaration needs a fresh endorsement.`,f.declarationReopen!.userId);
  }
 }
 if(d.reviewProcessVersion!==3&&fresh&&p&&p.state!=="declined"&&hasReviewTask(p,"content")){
  const missing=d.units.filter(u=>!p.coverage.includes(u.slug));
  const ownReport=currentReport(d,email);
  if(p.state==="finished"&&ownReport?.endorsements.some(e=>e.decision==="changes"))add("revise-report",ownReport.id,"Revise your content review report","A peer requested a revised report. Read the saved explanation, start a new report version and submit it for fresh independent endorsement.","review-summary");
  if(p.state!=="finished"){
   if(missing.length)add("coverage",r.fingerprint,"Review your remaining learning units",`${missing.length} learning units still need your coverage confirmation: ${missing.map(u=>u.title).join("; ")}. Open each unit and review its slides and embedded quizzes.`,"review-units");
   else add("report",r.fingerprint,"Submit your full content review report","Your unit coverage is complete. Check your saved findings, select your conclusion and submit the full report. A different reviewer must then endorse it.","review-summary");
  }
  for(const other of d.participants.filter(other=>other.email!==email&&other.state==="finished"&&hasReviewTask(other,"content"))){
   const report=currentReport(d,other.email);
   if(report&&report.userId!==userId&&!report.endorsements.some(e=>e.userId===userId)&&!report.endorsements.some(e=>e.decision==="approve"&&e.userId!==report.userId))
    add("endorse",report.id,"Independently check a submitted report",`Read the current report submitted by ${report.email}, then endorse it or request a revised report. This is a peer check and does not approve unresolved course defects.`,reportAnchor(report.id));
  }
 }
 if(fresh&&d.reviewProcessVersion!==3){
  for(const f of activeFindings(d).filter(f=>f.blocking&&f.outcome!=="satisfied")){
   if(principal&&f.status==="open")add("fix",`${f.id}:${r.fingerprint}`,"Address a blocking finding",`${f.unit.toUpperCase()} — ${f.reference}: apply and describe the correction, then record it as implemented. Another reviewer must verify it.`,`finding-${f.id}`);
   if(p&&hasReviewTask(p,"content")&&f.status==="fixed"&&f.fixedFingerprint===hash&&f.fixedBy!==userId)add("verify",`${f.id}:${hash}`,"Verify an implemented correction",`Check the deployed correction for ${f.unit.toUpperCase()} — ${f.reference}. Record verification only if the correction works.`,`finding-${f.id}`);
  }
 }
 if(principal){
  for(const request of d.requests??[])if(request.status==="pending")add("request",request.id,"Decide a review change request",`${request.requestedBy} requested ${request.kind}. Read the reason and record the APGI decision.`,`review-request-${request.id}`);
  if(v&&w.stage==="apgi_approval"&&!v.decisions.some(x=>x.email===email&&x.userId===userId))add("signoff",v.id,"Record your independent APGI commercial sign-off",`Read the full recorded commercial version. Approve it or reject it with the changes required. You can also save a non-binding counter-proposal in the discussion.${fresh?"":" The changed course deployment must be registered before formal sign-off is enabled."}`,commercialSignoffAnchor(email),commercial);
  if(["commercial_draft","negotiation"].includes(w.stage)&&(!v||v.decisions.some(x=>x.decision==="reject")||v.proposal))add("pricing",v?.id??"initial","Prepare the commercial revision",v?.decisions.some(x=>x.decision==="reject")?"A principal rejected the saved version. Read the recorded decision and proposals, revise the pricing assumptions and save a new version for fresh independent approval.":"Prepare or revise the pricing assumptions and save the exact commercial version. Saving does not send an offer or approve the terms.",v?"commercial-version":"commercial-pricing",commercial);
  if(v&&w.stage==="commercial_draft"&&!v.submittedAt)add("submit",v.id,"Request independent APGI commercial approval","Check the saved version and proposed learner fee, then request both independent APGI signatures.","commercial-version",commercial);
  if(v&&w.partner&&w.stage==="apgi_approval"&&bothCommercialApprovals(v)&&!v.offeredAt)add("offer",v.id,"Send the jointly approved company offer",`Both APGI signatures are saved. Review the approved version before sending the offer to ${w.partnerEmail}.`,"commercial-send-offer",commercial);
 }
 if(p&&p.state!=="declined"&&v&&hasReviewTask(p,"commercials")&&(principal||v.offeredAt&&["partner_offer","ready_to_publish"].includes(w.stage))&&!taskDecision(d,email,"commercials",v.id)&&!commercialReviewApproved(d,email,userId))
  add("commercial-review",v.id,"Record your assigned commercial review",`Read the commercial proposal and record your assessment. Your saved comments remain visible in the commercial discussion. This assigned review is separate from the two APGI signatures.${fresh?"":" Formal decisions wait for deployment registration; discussion proposals can still be saved."}`,"assigned-commercial-review",commercial);
 if(fresh&&(p&&p.state!=="declined"&&hasReviewTask(p,"branding")||email===w.partnerEmail)&&!taskDecision(d,email,"branding",String(brandRevision)))
  add("branding",String(brandRevision),"Review the current company branding","Check the logo, colours, footer and sample certificate, then save approval or request changes for this exact branding revision.","branding-review");
 if(v&&email===w.partnerEmail&&w.stage==="partner_offer"&&companyBrandApproved(r,brandRevision)&&!v.acceptance)
  add("acceptance",v.id,"Respond to your company's commercial offer","Read the jointly approved offer. The nominated company owner may accept the exact terms or propose changes. APGI commercial reviewers do not accept on the company's behalf.","commercial-partner-offer",commercial);
 if(principal&&d.requesterId===userId){
  if(!w.contentApproval&&!contentReviewBlockers(r,hash).length)add("clearance",hash,"Clear the final corrected course content","All prerequisite content checks are complete. Review the evidence and explicitly clear this exact content; commercial approval remains separate.","final-content-clearance");
  if(!reviewBlockers(r,hash,brandRevision).length)add("publication",`${hash}:${v?.id}`,"Perform final course publication","All required checks are complete. Review the exact release and explicitly publish it for the selected company.","final-publication");
 }
 for(const task of tasks)if(task.key.includes(":lu-initial:"))task.unit=task.anchor.replace("review-unit-","");
 return tasks;
}
