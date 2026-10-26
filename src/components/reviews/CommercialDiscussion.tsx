import {canProposeCommercial} from "@/lib/commercial-feedback";
import type {ReviewRound} from "@/lib/course-review";
import {commercialPrincipals} from "@/lib/publication-workflow";
import {commercialReviewerAnchor} from "@/lib/review-navigation";
import {SummaryFacts,SummaryText} from "@/components/shared/SummaryText";
import {ReviewForm} from "./ReviewForms";

export function CommercialDiscussion({round,email,principal}:{round:ReviewRound;email:string;principal:boolean}) {
 const d=round.document,v=d.workflow?.commercials.at(-1);
 if(!v)return null;
 const visible=(author:string)=>principal||author===email||!commercialPrincipals.some(p=>p===author);
 const decisions=(d.taskDecisions??[]).filter(x=>x.task==="commercials"&&visible(x.email));
 const feedback=(d.commercialFeedback??[]).filter(x=>visible(x.email));
 return <section className="review-box" id="commercial-discussion"><h3>Commercial comments and counter-proposals</h3>
 <p>Saved feedback is shown here with its author and exact commercial version. A suggestion does not change the terms or count as formal sign-off. Revised terms require a new saved version and fresh independent approvals.</p>
 {[...new Set([...d.participants.filter(p=>p.tasks?.includes("commercials")&&visible(p.email)).map(p=>p.email),...decisions.map(x=>x.email)])].map(author=><section key={author} id={commercialReviewerAnchor(author)}><h4>{author} — assigned commercial review</h4>
 {decisions.filter(x=>x.email===author).length?decisions.filter(x=>x.email===author).map(x=><article className="review-box" id={`commercial-review-entry-${x.id}`} key={x.id}><SummaryFacts entries={[["Decision",x.decision==="approve"?"Approved assigned review":"Changes requested"],["Commercial version",x.target],["Version status",x.target===v.id?"Current version":"Earlier version"],["Saved at",x.at]]}/><SummaryText text={x.comment}/></article>):<p>No assigned commercial review decision saved.</p>}
 </section>)}
 {feedback.map(x=><article className="review-box" id={`commercial-feedback-${x.id}`} key={x.id}><h4>{x.email} — saved suggestion</h4><SummaryFacts entries={[["Commercial version",x.versionId],["Version status",x.versionId===v.id?"Current version":"Earlier version"],["Saved at",x.at],...(x.price?[["Suggested learner fee",`${v.configuration.currency} ${x.price}`] as const]:[]),...(x.apgiShare?[["Suggested APGI share (%)",x.apgiShare] as const]:[]),...(x.recoveryRate?[["Suggested recovery (%)",x.recoveryRate] as const]:[])]}/><SummaryText text={x.comment}/></article>)}
 {d.events.map((e,index)=>e.action==="commercial_feedback"&&visible(e.actor)?<article id={`commercial-event-${index}`} className="review-box" key={index}><h4>{e.actor} — earlier saved commercial comment</h4><p>{e.at}</p><SummaryText text={e.detail}/></article>:null)}
 {canProposeCommercial(round,email,principal)?<section id="commercial-proposal"><h4>Add a comment or propose a change</h4><ReviewForm id={round.id} operation="commercial_proposal" hidden={{version_id:v.id}} label="Save my comment or counter-proposal"><label>Explanation<textarea name="comment" required minLength={5} maxLength={5000}/></label><fieldset><legend>Suggested figures — optional, for discussion</legend><label>Overall learner fee ({v.configuration.currency})<input name="proposal_price" type="number" min="0" step="0.01"/></label><label>Combined APGI share (%)<input name="proposal_apgi_share" type="number" min="0" max="100" step="0.01"/></label><label>Development recovery (%)<input name="proposal_recovery_rate" type="number" min="0" max="100" step="0.01"/></label></fieldset><p>These figures are suggestions for this exact version. Saving does not revise pricing, accept an offer or alter ownership.</p></ReviewForm></section>:<p>This review is read-only or the commercial offer is not yet available to you.</p>}
 </section>;
}
