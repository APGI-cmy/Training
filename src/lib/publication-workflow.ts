import {allocationAtPrice,costEstimate,minimumCourseQuote,moneyCents,percentageBps,type PlanningInput} from "./commercial-planning";
export const commercialPrincipals=["johan.ras@apginc.ca","jorrie.jordaan@apginc.ca"] as const;
export type WorkflowStage="content_review"|"commercial_draft"|"apgi_approval"|"partner_offer"|"negotiation"|"unresolved"|"ready_to_publish"|"published";
export type CommercialDecision={email:string;userId:string;at:string;decision:"approve"|"reject";reason:string};
export type PartnerProposal={at:string;email:string;userId:string;reasons:string[];explanation:string;price?:string;apgiShare?:string;recoveryRate?:string};
export type CommercialFeedback={id:string;versionId:string;at:string;email:string;userId:string;comment:string;price?:string;apgiShare?:string;recoveryRate?:string};
export type CommercialVersion={id:string;planId:string;at:string;configuration:Record<string,string|null>;proposedPrice:number;floor:number;decisions:CommercialDecision[];counterRound:number;previousAcceptances?:{at:string;email:string;userId:string;price:number;brandRevision:number;contentFingerprint:string}[];submittedAt?:string;offeredAt?:string;proposal?:PartnerProposal;acceptance?:{at:string;email:string;userId:string;price:number;brandRevision:number;contentFingerprint:string}};
export type PublicationWorkflow={version:2;stage:WorkflowStage;designerName:string;designerCompany:string;ownerId:string;partner:boolean;partnerEmail:string;partnerCompanyId?:string;commercialPreparation?:{at:string;email:string;userId:string};contentApproval?:{at:string;userId:string;email:string;fingerprint:string};commercials:CommercialVersion[];counterOffers:number;onboardingUrl?:string;internalBrandRevision?:number;unresolvedReason?:string};
export const rejectionReasons={price:"Course price too high",distribution:"Cost distribution not acceptable",recovery:"Development recovery not acceptable",branding:"Branding needs adjustment",other:"Other"} as const;
export const currentCommercial=(w:PublicationWorkflow)=>w.commercials.at(-1);
export function bothCommercialApprovals(v:CommercialVersion|undefined){return !!v&&commercialPrincipals.every(email=>v.decisions.some(d=>d.email===email&&d.decision==="approve"))&&!v.decisions.some(d=>d.decision==="reject")&&new Set(v.decisions.filter(d=>d.decision==="approve").map(d=>d.userId)).size===2;}
export function commercialInput(c:Record<string,string|null>):PlanningInput{
 const development=moneyCents(c.development_cost??"","development cost"),paid=moneyCents(c.already_paid??"","development already paid");if(paid>development)throw Error("Development paid cannot exceed the approved cost.");
 if(c.recovery_base&&!["partner_share","cost_cleared_pool"].includes(c.recovery_base))throw Error("Unknown recovery base; review the commercial version.");
 return {...costEstimate(c),minimumApgiCents:moneyCents(c.minimum_apgi_income??"","minimum APGI income"),apgiShareBps:percentageBps(c.apgi_share??"","APGI share"),recoveryBps:c.development_status==="recover"?percentageBps(c.recovery_rate??"","recovery rate"):0,outstandingCents:development-paid,recoveryBase:c.recovery_base==="partner_share"?"partner_share":"cost_cleared_pool"};
}
export function quoteCommercial(c:Record<string,string|null>,price?:number){
 const input=commercialInput(c),floor=minimumCourseQuote(input).price,allocation=allocationAtPrice(price??floor,input);
 if(!Number.isSafeInteger(allocation.price)||allocation.price<floor||allocation.shortfall||allocation.apgi<input.minimumApgiCents)throw Error("The overall course fee must cover the approved price floor and minimum APGI income.");return {input,floor,allocation};
}
export function approveCommercial(w:PublicationWorkflow,d:CommercialDecision,brandRevision:number){
 const v=currentCommercial(w);if(!v||w.stage!=="apgi_approval"||!v.submittedAt)throw Error("Submit the exact commercial version for APGI approval first.");
 if(!commercialPrincipals.includes(d.email as typeof commercialPrincipals[number]))throw Error("Only Johan and Jorrie may sign off commercials.");
 if(v.decisions.some(x=>x.email===d.email||x.userId===d.userId))throw Error("Your decision for this version is already committed; a different principal must decide independently.");
 v.decisions.push(d);if(d.decision==="reject")w.stage="commercial_draft";else if(bothCommercialApprovals(v)&&!w.partner){w.internalBrandRevision=brandRevision;w.stage="ready_to_publish";}
}
export function declinePartner(w:PublicationWorkflow,p:PartnerProposal){
 if(p.email!==w.partnerEmail)throw Error("Only the nominated company owner can decline this offer.");
 const v=currentCommercial(w);if(!v||w.stage!=="partner_offer"||!bothCommercialApprovals(v)||!v.offeredAt||v.acceptance||v.proposal)throw Error("There is no current approved partner offer to decline.");
 if(!p.reasons.length||p.reasons.some(r=>!Object.hasOwn(rejectionReasons,r))||p.explanation.trim().length<5)throw Error("Select a reason and explain the change you propose.");
 if(p.reasons.includes("distribution")&&!p.apgiShare)throw Error("Propose the combined APGI percentage; the company receives the remainder.");
 if(p.reasons.includes("recovery")&&!p.recoveryRate)throw Error("Propose a development recovery percentage.");
 if(p.reasons.includes("price")&&!p.price)throw Error("Propose an overall course fee.");
 if(p.price!==undefined)moneyCents(p.price,"proposed course fee");if(p.apgiShare!==undefined)percentageBps(p.apgiShare,"proposed APGI share");if(p.recoveryRate!==undefined)percentageBps(p.recoveryRate,"proposed recovery rate");
 v.proposal=p;w.stage=w.counterOffers>=3?"unresolved":"negotiation";if(w.stage==="unresolved")w.unresolvedReason="The partner declined after three APGI counter-offer responses.";
}
export function acceptPartner(w:PublicationWorkflow,p:{email:string;userId:string;at:string;price:number;brandRevision:number;contentFingerprint:string;confirmContent:boolean;confirmBrand:boolean;confirmTerms:boolean}){
 const v=currentCommercial(w);if(w.stage!=="partner_offer"||!v||!bothCommercialApprovals(v)||!v.offeredAt||v.proposal||v.acceptance)throw Error("This offer is not available for acceptance.");
 if(p.email!==w.partnerEmail)throw Error("Only the nominated company owner can accept this offer.");if(!p.confirmContent||!p.confirmBrand||!p.confirmTerms)throw Error("Confirm the reviewed content, current company branding and exact commercial schedule.");
 quoteCommercial(v.configuration,p.price);v.acceptance={at:p.at,email:p.email,userId:p.userId,price:p.price,brandRevision:p.brandRevision,contentFingerprint:p.contentFingerprint};w.stage="ready_to_publish";
}
export function commercialPublicationBlockers(w:PublicationWorkflow,hash:string,brandRevision:number){
 const reasons:string[]=[],v=currentCommercial(w);if(w.stage!=="ready_to_publish")reasons.push(`The workflow is at ${w.stage.replaceAll("_"," ")}, not ready for publication.`);
 if(w.contentApproval?.fingerprint!==hash)reasons.push("Current course content has not been approved.");if(!bothCommercialApprovals(v))reasons.push("Both Johan and Jorrie must approve this exact commercial version.");
 if(v)try{quoteCommercial(v.configuration,w.partner?v.acceptance?.price:v.proposedPrice);}catch{reasons.push("The selected price does not satisfy the approved cost and income requirements.");}
 if(w.partner){if(!v?.acceptance||v.acceptance.email!==w.partnerEmail||v.acceptance.contentFingerprint!==hash)reasons.push("Current partner content and commercial acceptance is outstanding.");if(v?.acceptance?.brandRevision!==brandRevision)reasons.push("The partner must confirm the current branding revision.");}else if(w.internalBrandRevision!==brandRevision)reasons.push("An APGI principal must confirm the current branding revision.");return reasons;
}
