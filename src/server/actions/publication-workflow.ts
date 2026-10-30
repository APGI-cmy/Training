"use server";
import {initialReviewerComplete} from "@/lib/lu-review-workflow";

import {revalidatePath} from "next/cache";

import {formText,validId} from "@/lib/company-structure";

import {commercialConditionsSummary,developmentRecoverySummary,moneyCents,sharingBasisLabel} from "@/lib/commercial-planning";

import {companyBrandApproved,hasReviewTask,outstandingAssignedTasks} from "@/lib/review-tasks";
import {contentReviewBlockers} from "@/lib/course-review";

import {approveCommercial,acceptPartner,declinePartner,bothCommercialApprovals,currentCommercial,commercialPrincipals,quoteCommercial} from "@/lib/publication-workflow";

import {requireReview,claimReviewer,commitReview,reviewEvent,reviewMail,processReviewMail} from "@/server/services/course-reviews";

import {internalWorkflowMail,preparePartnerOnboarding,requirePartnerOwner} from "@/server/services/publication-workflow";

import type {ReviewActionState} from "./course-reviews";

export async function publicationWorkflowAction(_:ReviewActionState,form:FormData):Promise<ReviewActionState>{

 try{

 const id=validId(formText(form,"round_id",36,36)),access=await requireReview(id),{round,principal,email,session,fresh,source}=access,w=round.document.workflow,op=formText(form,"operation"),now=new Date().toISOString();

 if(!w||round.status!=="open"||!fresh)throw Error("This workflow is closed or its course content changed. The live deployment must finish automatic registration before workflow decisions can be saved.");

 round.document.brand={name:source.brand.name,revision:source.brand.brand_revision,color:source.brand.primary_color,logo:source.brand.logo_path};
 const v=currentCommercial(w);let mail:ReturnType<typeof reviewMail>=[],message="Saved to the publication workflow.";

 if(["begin_commercials","approve_content","submit_commercials","revise_commercials","commercial_decision","send_offer","confirm_brand","reconfirm_partner"].includes(op)&&!principal)throw Error("Only Johan or Jorrie can perform this APGI action.");

 if(op!=="begin_commercials"&&op!=="approve_content"&&op!=="confirm_brand"&&op!=="reconfirm_partner"&&(!v||formText(form,"version_id")!==v.id))throw Error("The commercial version changed. Reload before deciding.");

 if(op==="begin_commercials"){
  const person=round.document.participants.find(p=>p.email===email);
  if(round.document.requester!==email||round.document.requesterId!==session.user.id)throw Error("The review requester starts commercial preparation.");
  if(w.stage!=="content_review"||(round.document.reviewProcessVersion===3?!initialReviewerComplete(round,email):!person||person.state!=="finished"||!round.document.units.every(u=>person.coverage.includes(u.slug))||!round.document.reports.some(r=>r.email===email)))throw Error("Complete your LU initial review and coverage before preparing commercials. Unresolved findings do not block commercial preparation.");
  w.commercialPreparation={at:now,email,userId:session.user.id};w.stage="commercial_draft";
  message="Commercial preparation opened. Content corrections and independent checks still block final publication.";
 }else if(op==="approve_content"){

  if(round.document.requester!==email||round.document.requesterId!==session.user.id)throw Error("Only the review requester may clear the final course content.");if(w.contentApproval)throw Error("Content approval is already recorded.");const blockers=contentReviewBlockers(round,source.fingerprint);if(blockers.length)throw Error(blockers.join(" "));

  if(form.get("confirm_content")!=="on")throw Error("Confirm the reviewed course content.");

  w.contentApproval={at:now,userId:session.user.id,email,fingerprint:source.fingerprint};if(w.stage==="content_review")w.stage="commercial_draft";

  mail=internalWorkflowMail(round,"content_approved",`content:${round.revision}`,"Final course content is cleared. Commercial and company approvals remain separate requirements for publication.");

 }else if(op==="revise_commercials"){
  if(w.stage!=="apgi_approval"||!v||v.offeredAt||v.acceptance)throw Error('Only an unsent proposal awaiting APGI approval can be returned for a revised draft.');
  const reason=formText(form,'reason',5,1500);w.stage='commercial_draft';
  reviewEvent(round.document,email,'commercial_revision_opened',`Prepare a new version after ${v.id}. Earlier terms and decisions are retained. ${reason}`);
  message='Prepare and save the revised commercial version. Earlier decisions remain in history; both principals must approve the new version. Content review work is retained.';
 }else if(op==="submit_commercials"){

  if(w.stage!=="commercial_draft"||!v||v.submittedAt||v.decisions.length)throw Error("Save a revised commercial version before requesting sign-off.");

  v.proposedPrice=moneyCents(formText(form,"proposed_price",1,30),"proposed learner fee");quoteCommercial(v.configuration,v.proposedPrice);v.submittedAt=now;w.stage="apgi_approval";

  mail=internalWorkflowMail(round,"commercial_signoff_requested",v.id,`Independently approve or reject commercial version ${v.id}. Both Johan and Jorrie must approve before partner delivery or publication. No signatures are inferred from course review.`);

 }else if(op==="commercial_decision"){

  const decision=formText(form,"decision");if(decision!=="approve"&&decision!=="reject")throw Error("Choose approve or reject.");if(form.get("confirm_terms")!=="on")throw Error("Confirm this exact commercial version.");

  approveCommercial(w,{email,userId:session.user.id,at:now,decision,reason:formText(form,"reason",5,5000)},source.brand.brand_revision);

  const assigned=round.document.participants.find(p=>p.email===email&&p.state!=="declined");
  if(assigned){claimReviewer(round,email,session.user.id);if(assigned.tasks&&!hasReviewTask(assigned,"content"))assigned.state=outstandingAssignedTasks(round,assigned,source.brand.brand_revision).length?"active":"finished";}

  mail=internalWorkflowMail(round,"commercial_decision",`${v!.id}:${email}`,`${email} recorded ${decision} for commercial version ${v!.id}. ${bothCommercialApprovals(v)?(w.partner?"Both approvals are complete. The partner offer may now be sent.":"The APGI course is awaiting explicit final publication."):"The other principal's independent decision remains required, unless a revision is needed."}`);

 }else if(op==="send_offer"){

  if(!w.partner||w.stage!=="apgi_approval"||!v||!bothCommercialApprovals(v)||v.offeredAt)throw Error("Both principals must approve this exact unsent partner offer.");

  w.onboardingUrl=await preparePartnerOnboarding(id);v.offeredAt=now;w.stage="partner_offer";

  if(!round.document.participants.some(p=>p.email===w.partnerEmail))round.document.participants.push({email:w.partnerEmail,role:"partner",state:"active",coverage:[]});

  const c=v.configuration,money=(n:number)=>`${c.currency} ${(n/100).toFixed(2)}`,q=quoteCommercial(c,v.proposedPrice).allocation;

  mail=reviewMail(round,"partner_offer",v.id,`Welcome to the APGI hosting platform. Your company's jointly approved course offer is ready. No separate subscription fee applies under this schedule.

Course: ${round.document.title}

Proposed learner fee: ${money(v.proposedPrice)}

Minimum learner fee: ${money(v.floor)}

Estimated running costs: ${money(q.costs)}

Cost administration: ${money(q.administration)} (costs only)

${developmentRecoverySummary(c)}

Split ${sharingBasisLabel(c)}: APGI ${c.apgi_share}%; your company ${c.platform_user_share}%.

${commercialConditionsSummary(c)}

Estimated company income at the proposed price: ${money(q.partner)}.

Review the course, adjust or confirm your company's branding, and accept or decline the commercial offer in the workspace. You can change the overall learner fee above the approved floor; the approved rates remain fixed. A decline requires reasons and proposed alternatives. Up to three APGI counter-offer responses are allowed; unresolved terms prevent publication.

Complete company owner onboarding if needed: ${w.onboardingUrl}

Publication remains subject to a final APGI principal action. Company learner payments must use an enabled platform-managed route; V2 payments are currently disabled.`,[w.partnerEmail]);

 }else if(op==="partner_accept"||op==="partner_decline"){

  if(!w.partner||email!==w.partnerEmail)throw Error("Only the nominated company owner may decide this offer.");await requirePartnerOwner(w.partnerCompanyId??round.organisation_id,session.user.id);

  if(op==="partner_accept"&&!companyBrandApproved(round,source.brand.brand_revision))throw Error("Approve the current branding in Branding review before accepting the commercial offer.");
  if(op==="partner_accept")acceptPartner(w,{email,userId:session.user.id,at:now,price:moneyCents(formText(form,"overall_price",1,30),"overall learner fee"),brandRevision:source.brand.brand_revision,contentFingerprint:source.fingerprint,confirmContent:form.get("confirm_content")==="on",confirmBrand:form.get("confirm_brand")==="on",confirmTerms:form.get("confirm_terms")==="on"});

  else declinePartner(w,{email,userId:session.user.id,at:now,reasons:form.getAll("rejection_reason").map(String),explanation:formText(form,"explanation",5,5000),...(formText(form,"alternative_price")?{price:formText(form,"alternative_price")}:{}),...(formText(form,"alternative_apgi_share")?{apgiShare:formText(form,"alternative_apgi_share")}:{}),...(formText(form,"alternative_recovery_rate")?{recoveryRate:formText(form,"alternative_recovery_rate")}:{} )});

  mail=internalWorkflowMail(round,op,`${v!.id}:${op}`,op==="partner_accept"?"The company owner accepted the course, current branding and commercial schedule. The course is queued for final publication by Johan or Jorrie.":`The company declined the offer. Reasons: ${v!.proposal!.reasons.join(", ")}. ${v!.proposal!.explanation}

Proposed fee: ${v!.proposal!.price??"Unchanged"}; combined APGI share: ${v!.proposal!.apgiShare??"Unchanged"}%; recovery: ${v!.proposal!.recoveryRate??"Unchanged"}%.

Status: ${w.stage}. Counter-offer responses used: ${w.counterOffers}/3.`);

  mail.push(...reviewMail(round,"partner_decision_receipt",`${v!.id}:${op}:receipt`,`Your decision is recorded. ${w.stage==="ready_to_publish"?"APGI will complete final publication.":w.stage==="unresolved"?"The three counter-offer response limit has been reached. The matter is unresolved and publication is blocked.":"Both APGI principals will review the proposal before any response is offered."}`,[email]));

 }else if(op==="confirm_brand"){

  if(w.partner||w.stage!=="ready_to_publish"||!bothCommercialApprovals(v)||form.get("confirm_brand")!=="on")throw Error("Confirm the current APGI branding after commercial approval.");w.internalBrandRevision=source.brand.brand_revision;

 }else if(op==="reconfirm_partner"){

  if(!w.partner||w.stage!=="ready_to_publish"||!v?.acceptance||v.acceptance.brandRevision===source.brand.brand_revision)throw Error("No branding reconfirmation is required.");

  v.previousAcceptances??=[];v.previousAcceptances.push(v.acceptance);delete v.acceptance;w.stage="partner_offer";mail=reviewMail(round,"brand_reconfirmation",`${v.id}:brand:${source.brand.brand_revision}`,"Your company branding changed after acceptance. Confirm the current branding and unchanged commercial offer before publication.",[w.partnerEmail]);

 }else throw Error("Choose a valid publication workflow action.");

 reviewEvent(round.document,email,op,`Workflow stage: ${w.stage}. Commercial version: ${v?.id??"Not prepared"}.`);await commitReview(round,session.user.id,op,mail);

 try{if(mail.length)await processReviewMail();}catch{/* Durable outbox retains pending delivery. */}

 revalidatePath(`/course-reviews/${id}`);revalidatePath(`/course-reviews/${id}/commercials`);revalidatePath("/course-reviews");revalidatePath(`/company/${round.organisation_id}`);return {success:message,...(["begin_commercials","revise_commercials"].includes(op)?{href:`/admin/courses/${round.course_id}/publish?review=${id}`}:{})};

 }catch(e){if(e instanceof Error&&"digest" in e)throw e;return {error:e instanceof Error?e.message:"Publication workflow could not be saved."};}

}

