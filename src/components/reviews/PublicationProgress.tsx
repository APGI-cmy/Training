import Link from "next/link";

import {ReviewForm} from "./ReviewForms";

import {PartnerOfferForm} from "./PartnerOfferForm";

import {contentReviewBlockers,type ReviewRound} from "@/lib/course-review";

import {currentCommercial,bothCommercialApprovals,quoteCommercial,commercialPrincipals} from "@/lib/publication-workflow";

export function PublicationProgress({round,principal,email,hash,brandRevision}:{round:ReviewRound;principal:boolean;email:string;hash:string;brandRevision:number}){

 const w=round.document.workflow;if(!w)return <section className="review-box"><h2>Earlier workflow</h2><p>This record is preserved. Start a content-first workflow to complete the current publication process.</p>{principal?<Link href={`/course-reviews/new?course=${round.course_id}&brand=${round.organisation_id}`}>Start current workflow</Link>:null}</section>;

 const v=currentCommercial(w),contentBlocks=contentReviewBlockers(round,hash),money=(n:number)=>`${v?.configuration.currency??"USD"} ${(n/100).toFixed(2)}`;

 const approvalHint="This checkbox and button will only be available once all modules and quizzes have been reviewed, all full review reports have been submitted and independently endorsed, and blocking findings have been resolved.";

 const requester=principal&&round.document.requester===email;

 const own=round.document.participants.find(p=>p.email===email);

 const preparationReady=own?.state==="finished"&&round.document.units.every(u=>own.coverage.includes(u.slug))&&round.document.reports.some(r=>r.email===email);

 const hintId=`content-approval-hint-${round.id}`;

 const steps=[["Content review",!!w.contentApproval],["APGI commercial sign-off",bothCommercialApprovals(v)],["Company content, branding and terms",!w.partner?bothCommercialApprovals(v):!!v?.acceptance],["Final APGI publication",round.status==="published"]] as const;

 return <section className="review-box" id="commercial-preparation" aria-label="Publication workflow"><h2>Continuous publication workflow</h2><ol className="review-steps">{steps.map(([label,done])=><li key={label}>{done?"Complete: ":""}{label}</li>)}</ol><p><strong>Current step: {round.status==="published"?"Published":w.stage.replaceAll("_"," ")}</strong></p><p>Course designer: {w.designerName} · {w.designerCompany}</p>{w.contentApproval?<p>Content approved by {w.contentApproval.email} · {w.contentApproval.at}. Commercial and branding decisions remain separate.</p>:<p>Commercial preparation can continue while findings are addressed. All content, peer checks, commercial and branding approvals remain required before publication.</p>}

 {requester&&w.stage==="content_review"?<><p>{preparationReady?"Your review is submitted. You can prepare commercials while the team resolves findings and completes independent checks.":"Complete all your LU/quiz coverage confirmations and submit your report to open commercial preparation."}</p><ReviewForm workflow id={round.id} operation="begin_commercials" label="Continue to commercials" disabled={!preparationReady}/></>:null}

 {requester&&!w.contentApproval?<details><summary>Final content clearance — requester only</summary><p>This final clearance remains separate from preparing and reviewing commercials.</p>{contentBlocks.length?<ul>{contentBlocks.map(b=><li key={b}>{b}</li>)}</ul>:null}<div className="review-approval-hint" role="group" aria-label="Content approval availability" data-disabled={!!contentBlocks.length} tabIndex={contentBlocks.length?0:undefined} aria-describedby={contentBlocks.length?hintId:undefined}><ReviewForm workflow id={round.id} operation="approve_content" label="Approve final corrected content" disabled={!!contentBlocks.length}><label><input name="confirm_content" type="checkbox" required disabled={!!contentBlocks.length}/> I approve this exact reviewed course content. This does not approve any commercials.</label></ReviewForm>{contentBlocks.length?<span role="tooltip" id={hintId} className="review-approval-tooltip">{approvalHint}</span>:null}</div></details>:null}

 {principal&&["commercial_draft","negotiation"].includes(w.stage)?<><Link className="primary-button" href={`/admin/courses/${round.course_id}/publish?review=${round.id}`}>{w.stage==="negotiation"?"Prepare APGI counter-offer response":"Prepare or revise commercials"}</Link><p>Both Johan and Jorrie must independently approve the saved commercial version. No partner offer is sent by saving.</p></>:null}

 {principal&&v?<section className="review-box"><h3>Commercial version {w.commercials.length}</h3><p>Version {v.id} · Counter-offer response {v.counterRound}/3</p><p>Minimum fee: {money(v.floor)} · Proposed fee: {money(v.proposedPrice)}</p><pre className="review-report">{v.configuration.terms_summary}</pre>{commercialPrincipals.map(e=>{const decision=v.decisions.find(d=>d.email===e);return <p key={e}>{e}: <strong>{decision?.decision??"Awaiting decision"}</strong>{decision?` · ${decision.at} · ${decision.reason}`:""}</p>;})}

 {w.stage==="commercial_draft"&&!v.submittedAt?<ReviewForm workflow id={round.id} operation="submit_commercials" hidden={{version_id:v.id}} label="Request joint APGI commercial sign-off"><label>Proposed learner fee ({v.configuration.currency})<input name="proposed_price" required defaultValue={(v.proposedPrice/100).toFixed(2)}/></label><p>The calculated minimum is {money(v.floor)}. The proposed fee may be higher.</p></ReviewForm>:null}

 {w.stage==="apgi_approval"&&!v.decisions.some(d=>d.email===email)?<ReviewForm workflow id={round.id} operation="commercial_decision" hidden={{version_id:v.id}} label="Commit my commercial decision"><label><input name="confirm_terms" type="checkbox" required/> I reviewed this exact commercial version, price floor and proposed fee.</label><label>Decision<select name="decision"><option value="approve">Approve</option><option value="reject">Reject — revise commercials</option></select></label><label>Decision reason<textarea name="reason" required minLength={5} maxLength={5000}/></label></ReviewForm>:null}

 {w.partner&&w.stage==="apgi_approval"&&bothCommercialApprovals(v)?<ReviewForm workflow id={round.id} operation="send_offer" hidden={{version_id:v.id}} label="Email approved offer and company-owner access"><p>Recipient: {w.partnerEmail}. This grants company-scoped owner access, never APGI administrator rights.</p></ReviewForm>:null}

 {v.proposal?<section><h4>Partner's proposal</h4><p>{v.proposal.reasons.join(", ")} · {v.proposal.explanation}</p><p>Proposed fee: {v.proposal.price??"Unchanged"}; APGI share: {v.proposal.apgiShare??"Unchanged"}%; recovery: {v.proposal.recoveryRate??"Unchanged"}%.</p><p>Prepare a revised schedule, then obtain both approvals before sending a response. Saving a response consumes one of the three counter-offer rounds.</p></section>:null}

 <details><summary>Earlier commercial versions ({w.commercials.length-1})</summary>{w.commercials.slice(0,-1).map(c=><p key={c.id}>Version {c.id} · {c.at} · {c.decisions.map(d=>`${d.email}: ${d.decision}`).join("; ")} · Partner: {c.acceptance?"Accepted":c.proposal?"Declined":"No decision"}</p>)}</details></section>:null}

 {w.partner&&email===w.partnerEmail&&v&&v.offeredAt?<section className="review-box"><h3>Your company's course offer</h3><p>APGI is your hosting and commercial partner. No separate hosting subscription applies. Learner payments must use an enabled platform-managed route. V2 payments are currently disabled.</p>{(!w.partnerCompanyId||w.partnerCompanyId===round.organisation_id)?<Link className="secondary-button" href={`/company/${round.organisation_id}?returnTo=${encodeURIComponent(`/course-reviews/${round.id}`)}`}>Review or adjust company branding and certificate</Link>:<p>This offering uses APGI branding, managed by APGI. Review that branding in the course preview. <Link href={`/company/${w.partnerCompanyId}`}>Manage your own company branding separately</Link>.</p>}{w.onboardingUrl?<p><a href={w.onboardingUrl}>Complete company-owner onboarding if needed</a></p>:null}<p>Approved sharing after costs and development recovery: APGI {v.configuration.apgi_share}%; your company {v.configuration.platform_user_share}%. Development recovery: {v.configuration.development_status==="recover"?v.configuration.recovery_rate:"0"}% of the cost-cleared pool, capped at the outstanding balance. Administration: {v.configuration.administration_rate}% of eligible costs only.</p>{w.stage==="partner_offer"?<PartnerOfferForm id={round.id} versionId={v.id} input={quoteCommercial(v.configuration).input} floor={v.floor} price={v.previousAcceptances?.at(-1)?.price??v.proposedPrice} currency={v.configuration.currency!} enabled={hash===round.fingerprint}/>:<p>Your response is recorded. Status: {w.stage.replaceAll("_"," ")}. {v.acceptance?`Accepted fee: ${money(v.acceptance.price)}`:"APGI will consider your proposal."}</p>}</section>:null}

 {!principal&&round.document.participants.some(p=>p.email===email&&p.state!=="declined"&&p.scope==="content_and_commercials")&&w.stage==="partner_offer"&&v?.offeredAt?<section className="review-box"><h3>Commercial review — offered version</h3><p>Proposed learner fee: {money(v.proposedPrice)}. Minimum fee: {money(v.floor)}. After costs and any agreed recovery: APGI {v.configuration.apgi_share}%; partner {v.configuration.platform_user_share}%. Recovery rate: {v.configuration.development_status==="recover"?v.configuration.recovery_rate:"0"}% of the cost-cleared pool.</p><ReviewForm id={round.id} operation="commercial_feedback" hidden={{version_id:v.id}} label="Send my commercial review to APGI"><label>Comments on this offered version<textarea name="comment" required minLength={5} maxLength={5000}/></label><p>This assignment allows comments, not APGI sign-off or changes to commercial terms. The named company owner records the company's formal acceptance or rejection.</p></ReviewForm></section>:null}

 {w.stage==="unresolved"?<p className="form-error">Unresolved: {w.unresolvedReason} Publication is blocked. The audit trail and three-response limit are retained.</p>:null}

 {principal&&w.stage==="ready_to_publish"&&!w.partner&&w.internalBrandRevision!==brandRevision?<ReviewForm workflow id={round.id} operation="confirm_brand" label="Confirm current APGI branding"><label><input name="confirm_brand" type="checkbox" required/> I confirm the current APGI brand and certificate revision.</label></ReviewForm>:null}

 {principal&&w.stage==="ready_to_publish"&&w.partner&&v?.acceptance&&v.acceptance.brandRevision!==brandRevision?<ReviewForm workflow id={round.id} operation="reconfirm_partner" label="Request partner confirmation of revised branding"><p>Branding changed. Content and joint commercial approvals remain, but the partner must confirm the new branding.</p></ReviewForm>:null}

 {w.stage==="ready_to_publish"?<p><a href="#final-publication">Open final publication checks</a>. All approvals are collected. Final publication must be performed explicitly by Johan or Jorrie using the release controls below.</p>:null}</section>;

}

