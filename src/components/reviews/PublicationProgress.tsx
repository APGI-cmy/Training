import {commercialReviewPath,commercialSignoffAnchor} from "@/lib/review-navigation";
import {CommercialDiscussion} from "./CommercialDiscussion";
import {hasReviewTask,companyBrandApproved} from "@/lib/review-tasks";
import {commercialConditionsSummary,developmentRecoverySummary,sharingBasisLabel} from "@/lib/commercial-planning";
import Link from "next/link";

import {ReviewForm} from "./ReviewForms";
import {SummaryFacts,SummaryText} from "@/components/shared/SummaryText";
import {WorkflowSectionHeading,WorkflowSectionStatus} from "./WorkflowSectionStatus";
import {findWorkflowStep,type WorkflowStep} from "@/lib/publication-guide";

import {PartnerOfferForm} from "./PartnerOfferForm";

import {type ReviewRound} from "@/lib/course-review";

import {currentCommercial,bothCommercialApprovals,quoteCommercial,commercialPrincipals} from "@/lib/publication-workflow";

export function PublicationProgress({round,principal,email,hash,brandRevision,guide}:{round:ReviewRound;principal:boolean;email:string;hash:string;brandRevision:number;guide?:WorkflowStep[]}){

 const w=round.document.workflow;if(!w)return <section className="review-box"><h2>Earlier workflow</h2><p>This record is preserved. Start a content-first workflow to complete the current publication process.</p>{principal?<Link href={`/course-reviews/new?course=${round.course_id}&brand=${round.organisation_id}`}>Start current workflow</Link>:null}</section>;

 const v=currentCommercial(w),money=(n:number)=>`${v?.configuration.currency??"USD"} ${(n/100).toFixed(2)}`;


 const requester=principal&&round.document.requester===email;

 const own=round.document.participants.find(p=>p.email===email);

 const preparationReady=own?.state==="finished"&&round.document.units.every(u=>own.coverage.includes(u.slug))&&round.document.reports.some(r=>r.email===email);




 return <section className="review-box" id="commercial-preparation" aria-label="Publication workflow"><WorkflowSectionHeading title="Commercial preparation and sign-off" step={findWorkflowStep(guide,"commercials")}/><p><strong>Current step: {round.status==="published"?"Published":w.stage.replaceAll("_"," ")}</strong></p><p>Course designer: {w.designerName} · {w.designerCompany}</p>{w.contentApproval?<p>Content approved by {w.contentApproval.email} · {w.contentApproval.at}. Commercial and branding decisions remain separate.</p>:<p>Commercial preparation can continue while findings are addressed. All content, peer checks, commercial and branding approvals remain required before publication.</p>}

 {requester&&w.stage==="content_review"?<><p>{preparationReady?"Your review is submitted. You can prepare commercials while the team resolves findings and completes independent checks.":"Complete all your LU/quiz coverage confirmations and submit your report to open commercial preparation."}</p><ReviewForm workflow id={round.id} operation="begin_commercials" label="Continue to commercials" disabled={!preparationReady||round.status!=="open"||hash!==round.fingerprint}/></>:null}



 {principal&&["commercial_draft","negotiation"].includes(w.stage)?<><div id="commercial-pricing"/><Link className="primary-button" href={`/admin/courses/${round.course_id}/publish?review=${round.id}`}>{w.stage==="negotiation"?"Prepare APGI counter-offer response":"Prepare or revise commercials"}</Link><p>Both Johan and Jorrie must independently approve the saved commercial version. No partner offer is sent by saving.</p></>:null}

 {principal&&v?<section id="commercial-version" className="review-box"><div id={`commercial-version-${v.id}`}/><div className="workflow-section-heading"><h3>Commercial version {w.commercials.length}</h3><WorkflowSectionStatus step={findWorkflowStep(guide,"price")}/></div><p><Link href={commercialReviewPath(round.id)}>Open the full commercial proposal and discussion</Link></p><SummaryFacts entries={[["Minimum learner fee",money(v.floor)],["Proposed learner fee",money(v.proposedPrice)],["Counter-offer responses used",`${v.counterRound} of 3`],["Commercial version reference",v.id]]}/><SummaryText commercial text={v.configuration.terms_summary}/><h4>Independent APGI decisions</h4>{commercialPrincipals.map(e=>{const decision=v.decisions.find(d=>d.email===e);return <section key={e} id={commercialSignoffAnchor(e)}><div className="workflow-section-heading"><h4>{e.startsWith("johan")?"Johan":"Jorrie"} — formal commercial sign-off</h4><WorkflowSectionStatus step={findWorkflowStep(guide,`signoff-${e}`)}/></div><SummaryFacts entries={[["Reviewer",e],["Decision",decision?.decision??"Awaiting decision"],...(decision?[["Recorded at",decision.at] as const]:[]) ]}/>{decision?<SummaryText text={decision.reason}/>:null}{email===e?(w.stage==="apgi_approval"&&!v.decisions.some(d=>d.email===email)?<ReviewForm disabled={round.status!=="open"||hash!==round.fingerprint} workflow id={round.id} operation="commercial_decision" hidden={{version_id:v.id}} label="Commit my commercial decision"><label><input name="confirm_terms" type="checkbox" required/> I reviewed this exact commercial version, price floor and proposed fee.</label><label>Decision<select name="decision"><option value="approve">Approve</option><option value="reject">Reject — revise commercials</option></select></label><label>Decision reason<textarea name="reason" required minLength={5} maxLength={5000}/></label></ReviewForm>:null):null}</section>;})}

 {w.stage==="commercial_draft"&&!v.submittedAt?<ReviewForm disabled={round.status!=="open"||hash!==round.fingerprint} workflow id={round.id} operation="submit_commercials" hidden={{version_id:v.id}} label="Request joint APGI commercial sign-off"><label>Proposed learner fee ({v.configuration.currency})<input name="proposed_price" required defaultValue={(v.proposedPrice/100).toFixed(2)}/></label><p>The calculated minimum is {money(v.floor)}. The proposed fee may be higher.</p></ReviewForm>:null}



 {w.partner&&w.stage==="apgi_approval"&&bothCommercialApprovals(v)?<div id="commercial-send-offer"><ReviewForm disabled={round.status!=="open"||hash!==round.fingerprint} workflow id={round.id} operation="send_offer" hidden={{version_id:v.id}} label="Email approved offer and company-owner access"><p>Recipient: {w.partnerEmail}. This grants company-scoped owner access, never APGI administrator rights.</p></ReviewForm></div>:null}

 {v.proposal?<section><h4>Partner's proposal</h4><ul>{v.proposal.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul><SummaryText headingLevel={5} text={v.proposal.explanation}/><SummaryFacts entries={[["Proposed fee",v.proposal.price??"Unchanged"],["APGI share (%)",v.proposal.apgiShare??"Unchanged"],["Recovery (%)",v.proposal.recoveryRate??"Unchanged"]]}/><p>Prepare a revised schedule, then obtain both approvals before sending a response. Saving a response consumes one of the three counter-offer rounds.</p></section>:null}

 <details><summary>Earlier commercial versions ({w.commercials.length-1})</summary>{w.commercials.slice(0,-1).map(c=><section key={c.id} id={`commercial-version-${c.id}`}><h4>Earlier saved commercial version</h4><SummaryText commercial text={c.configuration.terms_summary}/><SummaryFacts entries={[["Version reference",c.id],["Saved at",c.at],["Partner decision",c.acceptance?"Accepted":c.proposal?"Declined":"No decision"]]}/><ul>{c.decisions.map(d=><li key={d.email}><strong>{d.email}: {d.decision}</strong><SummaryText text={d.reason}/><p>Recorded at: {d.at}</p></li>)}</ul></section>)}</details></section>:null}

 {principal&&w.partner&&v?<section id="commercial-partner-offer" className="review-box"><h3>Company offer and acceptance</h3><SummaryFacts entries={[["Company signatory",w.partnerEmail],["Offer",v.offeredAt?"Sent":"Not sent"],["Response",v.acceptance?"Accepted":v.proposal?"Changes proposed":"Awaiting company decision"]]}/></section>:null}
 {w.partner&&email===w.partnerEmail&&!principal&&v&&v.offeredAt?<section id="commercial-partner-offer" className="review-box"><h3>Your company's course offer</h3><p>APGI is your hosting and commercial partner. No separate hosting subscription applies. Learner payments must use an enabled platform-managed route. V2 payments are currently disabled.</p>{(!w.partnerCompanyId||w.partnerCompanyId===round.organisation_id)?<Link className="secondary-button" href={`/company/${round.organisation_id}?returnTo=${encodeURIComponent(`/course-reviews/${round.id}`)}`}>Review or adjust company branding and certificate</Link>:<p>This offering uses APGI branding, managed by APGI. Review that branding in the course preview. <Link href={`/company/${w.partnerCompanyId}`}>Manage your own company branding separately</Link>.</p>}{w.onboardingUrl?<p><a href={w.onboardingUrl}>Complete company-owner onboarding if needed</a></p>:null}<h4>Approved revenue sharing</h4><SummaryFacts entries={[["Sharing basis",sharingBasisLabel(v.configuration)],["APGI share",`${v.configuration.apgi_share}%`],["Your company share",`${v.configuration.platform_user_share}%`],["Administration",`${v.configuration.administration_rate}% of eligible costs only`]]}/><h4>Development recovery</h4><SummaryText text={developmentRecoverySummary(v.configuration)}/>{w.stage==="partner_offer"&&!companyBrandApproved(round,brandRevision)?<p><a href={`/course-reviews/${round.id}#branding-review`}>Complete your branding sign-off before accepting the offer</a>.</p>:null}{w.stage==="partner_offer"?<PartnerOfferForm id={round.id} versionId={v.id} input={quoteCommercial(v.configuration).input} floor={v.floor} price={v.previousAcceptances?.at(-1)?.price??v.proposedPrice} currency={v.configuration.currency!} enabled={round.status==="open"&&hash===round.fingerprint&&companyBrandApproved(round,brandRevision)}/>:<p>Your response is recorded. Status: {w.stage.replaceAll("_"," ")}. {v.acceptance?`Accepted fee: ${money(v.acceptance.price)}`:"APGI will consider your proposal."}</p>}</section>:null}

 {!principal&&round.document.participants.some(p=>p.email===email&&p.state!=="declined"&&hasReviewTask(p,"commercials"))&&w.stage==="partner_offer"&&v?.offeredAt?<section className="review-box"><h3>Commercial review — offered version</h3><SummaryFacts entries={[["Proposed learner fee",money(v.proposedPrice)],["Minimum learner fee",money(v.floor)],["Sharing basis",sharingBasisLabel(v.configuration)],["APGI share",`${v.configuration.apgi_share}%`],["Partner share",`${v.configuration.platform_user_share}%`]]}/><h4>Development recovery</h4><SummaryText text={developmentRecoverySummary(v.configuration)}/><ReviewForm id={round.id} operation="commercial_feedback" hidden={{version_id:v.id}} label="Send my commercial review to APGI"><label>Comments on this offered version<textarea name="comment" required minLength={5} maxLength={5000}/></label><p>This assignment allows comments, not APGI sign-off or changes to commercial terms. The named company owner records the company's formal acceptance or rejection.</p></ReviewForm></section>:null}

 {v?.offeredAt&&(principal||email===w.partnerEmail||round.document.participants.some(p=>p.email===email&&p.state!=="declined"&&hasReviewTask(p,"commercials")))&&commercialConditionsSummary(v.configuration)?<section id="commercial-ownership" className="review-box"><h3>Offered ownership and sharing conditions</h3><SummaryText commercial text={commercialConditionsSummary(v.configuration)}/><p>These are the conditions of the offered commercial version. Earlier approved versions remain unchanged.</p></section>:null}
 {v&&(principal||v.offeredAt&&(email===w.partnerEmail||round.document.participants.some(p=>p.email===email&&p.state!=="declined"&&hasReviewTask(p,"commercials"))))?<CommercialDiscussion round={round} email={email} principal={principal}/>:null}
 {w.stage==="unresolved"?<p className="form-error">Unresolved: {w.unresolvedReason} Publication is blocked. The audit trail and three-response limit are retained.</p>:null}

 {principal&&w.stage==="ready_to_publish"&&!w.partner&&w.internalBrandRevision!==brandRevision?<ReviewForm disabled={round.status!=="open"||hash!==round.fingerprint} workflow id={round.id} operation="confirm_brand" label="Confirm current APGI branding"><label><input name="confirm_brand" type="checkbox" required/> I confirm the current APGI brand and certificate revision.</label></ReviewForm>:null}

 {principal&&w.stage==="ready_to_publish"&&w.partner&&v?.acceptance&&v.acceptance.brandRevision!==brandRevision?<ReviewForm disabled={round.status!=="open"||hash!==round.fingerprint} workflow id={round.id} operation="reconfirm_partner" label="Request partner confirmation of revised branding"><p>Branding changed. Content and joint commercial approvals remain, but the partner must confirm the new branding.</p></ReviewForm>:null}

 {w.stage==="ready_to_publish"?<p><a href="#final-publication">Open final publication checks</a>. All approvals are collected. Final publication must be performed explicitly by Johan or Jorrie using the release controls below.</p>:null}</section>;

}

