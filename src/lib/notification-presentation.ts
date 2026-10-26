import {notificationTarget,type PersonalNotification} from "./notifications";
import {commercialReviewPath,commercialSignoffAnchor} from "./review-navigation";
import type {ReviewRound} from "./course-review";

export function presentNotification(n:PersonalNotification,round?:ReviewRound,principal=false,viewerEmail=""):PersonalNotification{
 const result={...n,requirement:n.context?.requirement,resolved_at:n.context?.resolved_at};
 const event=n.event,base=round?`/course-reviews/${round.id}`:undefined;
 if(base&&round){
  const course=round.document.title,current=round.document.workflow?.commercials.at(-1),offered=!!current?.offeredAt;
  const commercial=commercialReviewPath(round.id),actor=event?.actor??"A reviewer";
  if(n.context?.review_task){result.action_label="Open this required action";}
  else if(event){
   if(event.action==="task_decision"&&event.task_decision){
    const decision=event.task_decision,kind=decision.task==="commercials"?"Commercial":"Branding";
    result.message=`${kind} review: ${decision.email} ${decision.decision==="approve"?"approved the assigned review":"requested changes"} — ${course}`;
    const mayRead=decision.task!=="commercials"||principal||decision.email===viewerEmail||offered;
    result.requirement=`${decision.email} saved an assigned ${kind.toLowerCase()} review decision.${mayRead?` Saved explanation: ${decision.comment}`:" The commercial details become available to the company when the approved offer is sent."} This does not replace formal APGI commercial sign-off.`;
    result.target_path=decision.task==="commercials"?`${commercial}#commercial-review-entry-${decision.id}`:`${base}#branding-review`;
   }else if(event.action==="commercial_decision"){
    result.message=`APGI commercial decision recorded by ${actor} — ${course}`;
    const decision=round.document.workflow?.commercials.find(v=>v.id===event.version)?.decisions.find(d=>d.email===actor);
    result.requirement=principal&&decision?`${actor} recorded ${decision.decision}. Explanation: ${decision.reason}. Read the exact proposal and recorded decision; if changes were requested, prepare a revised version for fresh independent approvals.`:"An independent APGI commercial decision was recorded. The company offer is available after the required joint sign-off.";
    result.target_path=event.version===current?.id?`${commercial}#${commercialSignoffAnchor(actor)}`:`${commercial}#commercial-version-${event.version}`;
   }else if(event.action==="commercial_proposal"&&event.proposal){
    result.message=`Commercial counter-proposal saved by ${actor} — ${course}`;
    result.requirement=`Read the saved discussion proposal${principal||offered?`: ${event.proposal.comment}`:" when the company offer is available"}. A proposal does not change the recorded terms or count as approval.`;
    result.target_path=`${commercial}#commercial-feedback-${event.proposal.id}`;
   }else if(event.action==="commercial_feedback"){
    result.message=`Commercial feedback saved by ${actor} — ${course}`;
    result.requirement="Read the saved commercial feedback and decide whether a revised proposal is needed. Feedback does not amend the terms.";
    result.target_path=`${commercial}#commercial-event-${event.event_index}`;
   }else if(event.action==="report"){
    result.message=`Content review report submitted by ${actor} — ${course}`;
    result.requirement="Read this submitted report. If an independent check is still required and you are an eligible different reviewer, endorse it or request a revision.";
    result.target_path=`${base}#${event.report_id?`report-${event.report_id}`:"my-full-review"}`;
   }else if(["finding","reply","fixed","close"].includes(event.action)){
    result.message=`${event.action==="fixed"?"Correction declared implemented":event.action==="close"?"Finding updated or verified":"Review finding or discussion updated"} by ${actor} — ${course}`;
    result.requirement="Read the saved finding, its discussion and current status. Implementation requires a different reviewer to verify it; reading a notification does not close the finding.";
    result.target_path=`${base}#${event.finding_id?`finding-${event.finding_id}`:"shared-findings"}`;
   }else{
    const names:Record<string,string>={submit_commercials:"Independent commercial signatures requested",commercial_version_saved:"New commercial version saved",begin_commercials:"Commercial preparation opened",request_change:"Review change requested",decide_change:"Review change request decided",endorse:"Peer report decision recorded",register_content_revision:"Corrected course deployment registered",partner_accept:"Company offer accepted",partner_decline:"Company changes proposed",send_offer:"Company commercial offer sent",publish:"Course published",cancel:"Review cancelled"};
    result.message=`${names[event.action]??event.action.replaceAll("_"," ")} — ${course}`;
    result.requirement=`${actor} recorded this workflow update. Open the relevant record to read its saved outcome. Any response still required from you has a separate action notification.`;
    result.target_path=["submit_commercials","commercial_version_saved","begin_commercials","partner_accept","partner_decline","send_offer"].includes(event.action)?commercial:["request_change","decide_change"].includes(event.action)?`${base}#manage-request`:event.action==="register_content_revision"?`${base}#changes-implemented`:event.action==="endorse"?`${base}#my-full-review`:event.action==="publish"?`${base}#final-publication`:base;
   }
  }else if(n.context?.legacy_review_reminder){
   result.message=`Earlier general review reminder — ${course}`;
   result.requirement="This earlier reminder covered the whole review. Current outstanding work is now listed as separate, specific action notifications. This record remains in your history.";
   result.target_path=base;
  }
  if(round.status!=="open")result.requirement=`This review is ${round.status}. The recorded update is retained for reference; no further response is required in this round. ${result.requirement??""}`;
 }
 if(!result.requirement)result.requirement=result.response_type==="acknowledge"?"Read this update, then acknowledge receipt. Acknowledgement does not approve an agreement or other workflow decision.":result.pending?"Open the named request, review its details and complete the required response in that workflow.":"This is an informational update. Open its record to read the saved details; no workflow response is requested by this notification.";
 result.target_path=notificationTarget(result.target_path,result.message);
 // Immutable event context is server-only. Do not send unrelated principal comments to client controls.
 delete result.event;delete result.context;delete result.event_key;
 return result;
}
