import "server-only";
import {randomUUID,randomBytes,createHash} from "node:crypto";
import {adminRest} from "@/server/supabase/admin-rest";
import {rows,write} from "./company-structure";
import {requireReview,commitReview,reviewEvent,reviewMail} from "./course-reviews";
import {currentCommercial,quoteCommercial,type CommercialVersion,commercialPrincipals} from "@/lib/publication-workflow";
import type {DraftRecord} from "@/lib/company-structure";
export async function attachCommercialPlan(roundId:string,planId:string,actorId:string){
 const {round,principal,email,fresh,session}=await requireReview(roundId),w=round.document.workflow;
 if(!principal||session.user.id!==actorId||!w||!fresh||!w.contentApproval||w.contentApproval.fingerprint!==round.fingerprint)throw Error("Approve this course content before preparing commercials.");
 if(!["commercial_draft","negotiation"].includes(w.stage))throw Error("This workflow is not accepting a commercial revision. Its approvals are preserved.");
 const plan=(await rows<DraftRecord>(`/rest/v1/commercial_agreement_drafts?id=eq.${planId}&select=*&limit=1`))[0];
 if(!plan||plan.kind!=="course_agreement"||plan.organisation_id!==round.organisation_id||plan.course_id!==round.course_id||plan.configuration.rights_holder!==w.ownerId||plan.configuration.designer_name!==w.designerName||plan.configuration.designer_company!==w.designerCompany)throw Error("The plan must match this approved course, owner, design credits and publishing brand.");
 const previous=currentCommercial(w);if(previous?.planId===planId){if(previous.decisions.some(d=>d.decision==="reject"))throw Error("A rejected commercial version must be revised before resubmission.");return;}
 if(w.stage==="negotiation"){if(w.counterOffers>=3)throw Error("Three counter-offer responses have been used. This negotiation cannot be reset.");w.counterOffers++;}
 const quote=quoteCommercial(plan.configuration);
 const v:CommercialVersion={id:randomUUID(),planId,at:new Date().toISOString(),configuration:{...plan.configuration},proposedPrice:quote.floor,floor:quote.floor,decisions:[],counterRound:w.counterOffers};
 w.commercials.push(v);w.stage="commercial_draft";delete w.onboardingUrl;
 reviewEvent(round.document,email,"commercial_version_saved",`Commercial version ${v.id}; counter-offer response ${w.counterOffers}/3. No previous decisions carry over.`);
 await commitReview(round,actorId,"commercial_version_saved");
}
export async function requirePartnerOwner(organisationId:string,userId:string){
 const memberships=await rows<{user_id:string}>(`/rest/v1/organisation_memberships?organisation_id=eq.${organisationId}&user_id=eq.${userId}&membership_role=eq.owner&is_active=eq.true&select=user_id`);
 if(!memberships.length)throw Error("Complete this company's owner invitation before deciding its commercial offer.");
}
export async function preparePartnerOnboarding(roundId:string){
 const {round,principal,session}=await requireReview(roundId),w=round.document.workflow,v=w&&currentCommercial(w);
 if(!principal||!w?.partner||!v||!commercialPrincipals.every(e=>v.decisions.some(d=>d.email===e&&d.decision==="approve"))||w.stage!=="apgi_approval")throw Error("Both APGI principals must approve before owner onboarding.");
 const result=await adminRest("/rest/v1/rpc/v2_company_owner_exists",{method:"POST",body:JSON.stringify({p_company:round.organisation_id,p_email:w.partnerEmail})});
 if(!result.ok)throw Error("Company owner access could not be checked.");if(await result.json())return `${process.env.NEXT_PUBLIC_APP_URL}/course-reviews/${roundId}`;
 const token=randomBytes(32).toString("base64url"),id=randomUUID(),expires=new Date(Date.now()+14*86400000).toISOString();
 const pending=await rows<{id:string}>(`/rest/v1/course_invitations?organisation_id=eq.${round.organisation_id}&recipient_email=eq.${encodeURIComponent(w.partnerEmail)}&invited_role=eq.business_owner&status=in.(pending,sent)&revoked_at=is.null&select=id`);
 // Rotate only this company's pending owner invitation on an explicit offer send. No email is sent before the workflow commit.
 for(const p of pending){await write(`/rest/v1/course_invitations?id=eq.${p.id}`,{status:"revoked",revoked_at:new Date().toISOString()},"PATCH");await write("/rest/v1/course_invitation_events",{invitation_id:p.id,event_type:"revoked",actor_id:session.user.id,metadata:{reason:"Replaced by jointly approved course offer",round_id:roundId}});}
 await write("/rest/v1/course_invitations",{id,recipient_email:w.partnerEmail,course_id:null,invited_role:"business_owner",organisation_id:round.organisation_id,basis:"internal_allocation",reason:"Company owner onboarding for approved course offer",expires_at:expires,created_by:session.user.id,token_hash:createHash("sha256").update(token).digest("hex")});
 await write("/rest/v1/course_invitation_events",{invitation_id:id,event_type:"created",actor_id:session.user.id,metadata:{invited_role:"business_owner",round_id:roundId,delivery:"course_offer_queue"}});
 return `${process.env.NEXT_PUBLIC_APP_URL}/invitations/${token}`;
}
export const internalWorkflowMail=(round:Parameters<typeof reviewMail>[0],kind:string,key:string,body:string)=>reviewMail(round,kind,key,body,[...commercialPrincipals]);
