"use server";

import {randomUUID,randomBytes,createHash} from "node:crypto";

import {revalidatePath} from "next/cache";

import {redirect} from "next/navigation";

import {requirePlatformPrincipal} from "@/server/services/platform-principals";

import {adminRest} from "@/server/supabase/admin-rest";

import {rows,write} from "@/server/services/company-structure";

import {getSupabaseRestUrl} from "@/server/auth/session";

import {formText,validId} from "@/lib/company-structure";

import {reviewPeople,currentReport,canWork,normalizedEmail,type ReviewRound} from "@/lib/course-review";

import {assertReviewWork,claimReviewer,commitReview,processReviewMail,publishReview,requireReview,reviewEvent,reviewMail,reviewSource,contentSource} from "@/server/services/course-reviews";

import {hasAnswerForEveryScannexTheoryQuestion,scoreScannexTheoryAssessment} from "@/server/assessments/scannex-theory-bank";

import type {ScannexTheoryActionState} from "./assessments/submit-scannex-theory-attempt";

import type {ScannexTheoryAnswerState} from "@/types/scannex-assessment";

export type ReviewActionState={error?:string;success?:string;href?:string};

export async function previewReviewTheory(_:ScannexTheoryActionState,form:FormData):Promise<ScannexTheoryActionState>{

 try{const {round,fresh}=await requireReview(validId(String(form.get("round_id")??"")));if(!fresh||round.course_id!=="scannex-training-programme")throw Error("This review version is unavailable.");

  const raw=String(form.get("answers")??"");if(raw.length>30000)throw Error("Invalid answers.");const answers=JSON.parse(raw) as ScannexTheoryAnswerState;

  if(!answers||typeof answers!=="object"||Array.isArray(answers)||Object.values(answers).some(a=>!Array.isArray(a)||a.some(v=>typeof v!=="string"))||!hasAnswerForEveryScannexTheoryQuestion(answers))throw Error("Answer every question before checking the review preview.");

  const score=scoreScannexTheoryAssessment(answers);return {...score,message:"Review preview checked. No learner attempt or grade was recorded."};

 }catch(e){if(e instanceof Error&&"digest" in e)throw e;return {error:e instanceof Error?e.message:"Preview could not be checked."};}

}

const text=(f:FormData,key:string,min=1,max=5000)=>formText(f,key,min,max);

const cutoffValue=(f:FormData)=>{const raw=text(f,"cutoff",16,16);if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(raw))throw Error("Choose a cutoff in South African time.");const ms=Date.parse(raw+":00+02:00");if(!Number.isFinite(ms)||ms<=Date.now())throw Error("Choose a future cutoff date and time.");return new Date(ms).toISOString();};

export async function createCourseReview(_:ReviewActionState,form:FormData):Promise<ReviewActionState>{

 const {session}=await requirePlatformPrincipal();

 try{

  const courseId=text(form,"course_id"),brandId=validId(text(form,"organisation_id"));

  const source=await contentSource(courseId,brandId),{course,brand}=source;

  const designerName=text(form,"designer_name",2,180),designerCompany=text(form,"designer_company",2,180),ownerId=validId(text(form,"rights_holder"));

  const owner=(await rows<{id:string;slug:string}>(`/rest/v1/organisations?id=eq.${ownerId}&is_active=eq.true&select=id,slug`))[0];if(!owner)throw Error("Choose the current legal course owner.");

  const people=reviewPeople(form.getAll("review_email").map(String),form.getAll("review_role").map(String),session.user.email!);

  const partner=brand.slug!=="apgi"||owner.slug!=="apgi",acceptor=partner?normalizedEmail(text(form,"terms_acceptor",3,254)):"";

  if(partner&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acceptor))throw Error("Enter the future company owner's email.");

  // A repeated submit resumes the existing round for this exact saved plan/version.

  const previous=await rows<ReviewRound>(`/rest/v1/course_review_rounds?course_id=eq.${course.slug}&organisation_id=eq.${brand.id}&fingerprint=eq.${source.fingerprint}&status=eq.open&select=*&order=created_at.desc&limit=1`);

  if(previous.length)return {success:"This plan already has an active review. Open it to continue.",href:`/course-reviews/${previous[0].id}`};

  const id=randomUUID(),cutoff=cutoffValue(form),now=new Date().toISOString();

  const round:ReviewRound={id,plan_id:null,organisation_id:brand.id,course_id:course.slug,fingerprint:source.fingerprint,revision:1,status:"open",created_at:now,document:{workflow:{version:2,stage:"content_review",designerName,designerCompany,ownerId,partner,partnerCompanyId:brand.slug!=="apgi"?brand.id:ownerId,partnerEmail:acceptor,commercials:[],counterOffers:0},title:course.title,brand:{name:brand.name,revision:brand.brand_revision,color:brand.primary_color,logo:brand.logo_path},requester:normalizedEmail(session.user.email!),requesterId:session.user.id,cutoff,units:course.units.map(u=>({slug:u.slug,title:u.title})),participants:people,reports:[],findings:[],events:[],terms:{text:"Commercials follow approved content and require separate joint APGI approval.",partner,acceptor}}};

  const prior=(await rows<ReviewRound>(`/rest/v1/course_review_rounds?organisation_id=eq.${brand.id}&course_id=eq.${course.slug}&select=*&order=created_at.desc&limit=1`))[0];

  if(prior){round.document.findings=prior.document.findings.filter(f=>f.status!=="closed").map(f=>({...f,status:"open",fixedBy:undefined,text:`Carried from review ${prior.id}:\n${f.text}`,replies:[...f.replies]}));}

  reviewEvent(round.document,session.user.email!,"review_requested","Course content recorded first. Commercials are prepared after content approval. Daily reminders stop on completion, decline or cutoff. Unfinished work requires an extension.");

  const invitations=people.map(p=>({email:p.email,token:randomBytes(32).toString("base64url")}));

  const messages=reviewMail(round,"invitation","invite",`You are invited to a collaborative course review by ${session.user.email}. Full reviewers examine every LU and quiz, mark coverage and submit a report, even when no issues are found. Every full report needs one different reviewer's endorsement. Peer-only checkers may read and endorse reports directly. Findings, screenshots and comments are shared with the assigned team. You may decline with a reason. Daily reminders stop when you finish, decline or reach the cutoff. Overdue work requires an extension and never counts as approval. Sign in with the invited email. Review access does not enrol you or grant administrator rights.`);

  for(const m of messages){const invite=invitations.find(i=>i.email===m.to)!;m.body+=`\n\nFirst time on V2? Create your separate review account here: ${process.env.NEXT_PUBLIC_APP_URL}/course-reviews/${id}/join/${invite.token}`;}

  const saved=await adminRest("/rest/v1/rpc/v2_create_course_review",{method:"POST",body:JSON.stringify({p_round:round,p_actor:session.user.id,p_mail:messages,p_invites:invitations.map(i=>({email:i.email,hash:createHash("sha256").update(i.token).digest("hex"),expires:cutoff}))})});

  if(!saved.ok)throw Error("Review could not be created, or another request already created this exact round. Reload the saved plan and continue.");

  try{await processReviewMail();}catch{/* Delivery status remains visible in the durable queue. */}

  revalidatePath("/course-reviews");return {success:"Review requested. Invitations are queued; check delivery status in the workspace.",href:`/course-reviews/${id}`};

 }catch(e){return {error:e instanceof Error?e.message:"Review could not be requested."};}

}

export async function courseReviewAction(_:ReviewActionState,form:FormData):Promise<ReviewActionState>{

 try{

  const id=validId(text(form,"round_id")),access=await requireReview(id),{round,session,email,principal,fresh}=access,d=round.document;

  const op=text(form,"operation"),now=new Date().toISOString();let notice="Saved to the shared review.",mail= [] as ReturnType<typeof reviewMail>;

  if(op==="publish"){

   if(!principal)throw Error("Only Johan or Jorrie may publish.");

   if(form.get("confirm_release")!=="on")throw Error("Confirm the exact reviewed release before publishing.");

   await publishReview(round,session.user.id,access.source.fingerprint,access.source.brand.brand_revision);
   try{await processReviewMail();}catch{/* Publication and its outbox are committed atomically; delivery can retry. */}

   revalidatePath(`/company/${round.organisation_id}`);revalidatePath(`/course-reviews/${id}`);

   return {success:"Reviewed release published for this V2 company. Prices, payments and V1 remain unchanged."};

  }

  if(op==="extend"||op==="team"||op==="resend_invite"){

   if(d.workflow&&d.workflow.stage!=="content_review")throw Error("Content review is already approved. Start a new content round to change its team.");

   if(!principal)throw Error("Only a platform principal can manage the review.");

   if(round.status!=="open")throw Error("This round is closed.");

   const reason=op==="resend_invite"?"Requester explicitly resent the pending review invitation.":text(form,"reason",5);let newJoin:{email:string;token:string}|undefined;

   if(op==="extend")d.cutoff=cutoffValue(form);

   else if(op==="team"){

    const remove=normalizedEmail(formText(form,"remove_email"));

    if(remove){

     const person=d.participants.find(p=>p.email===remove);

     if(!person||person.state!=="declined")throw Error("Only a recorded decline can be acknowledged here.");

     d.participants=d.participants.filter(p=>p.email!==remove);

    }

    const add=normalizedEmail(formText(form,"add_email"));

    if(add){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(add)||d.participants.some(p=>p.email===add))throw Error("Enter a different valid reviewer email.");d.participants.push({email:add,role:"primary",state:"invited",coverage:[]});newJoin={email:add,token:randomBytes(32).toString("base64url")};}

    if(d.participants.filter(p=>p.role==="primary"&&p.state!=="declined").length<2)throw Error("Add a replacement full reviewer before acknowledging the decline; two are required.");

   }

   else{assertReviewWork(round,fresh);const recipient=normalizedEmail(text(form,"recipient",3,254));const target=d.participants.find(p=>p.email===recipient);if(!target||target.state==="declined"||target.state==="finished")throw Error("Only an unfinished, active review invitation can be resent.");newJoin={email:recipient,token:randomBytes(32).toString("base64url")};}

   reviewEvent(d,email,op,reason);mail=reviewMail(round,op,`${op}:${round.revision}`,`${email} updated the review: ${reason}. New cutoff: ${d.cutoff}`,op==="resend_invite"?[newJoin!.email]:undefined);

   if(newJoin){await write("/rest/v1/course_review_join_tokens",{token_hash:createHash("sha256").update(newJoin.token).digest("hex"),round_id:id,email:newJoin.email,expires_at:d.cutoff});const m=mail.find(m=>m.to===newJoin!.email)!;m.kind="invitation";m.body+=`\nYou are a full course reviewer. Review every LU and quiz and submit a report. Each report needs a different reviewer's endorsement. Findings are shared with the assigned team. Decline in the workspace with a reason if necessary. Reminders stop on completion, decline or cutoff; overdue work requires extension, never automatic approval.\nCreate a separate V2 review account if needed: ${process.env.NEXT_PUBLIC_APP_URL}/course-reviews/${id}/join/${newJoin.token}`;}

  }else{

   assertReviewWork(round,fresh);const person=claimReviewer(round,email,session.user.id);

   if(op==="finding"){

    if(person.state==="finished")throw Error("Your report is committed. Add a new report version after recording further findings; use discussion meanwhile.");

    const unit=text(form,"unit"),reference=text(form,"reference",1,200);

    if(!d.units.some(u=>u.slug===unit))throw Error("Choose the LU or assessment being reviewed.");

    const findingId=randomUUID();let attachment:string|undefined;

    const file=form.get("screenshot");

    if(file instanceof File&&file.size){

     if(file.size>2*1024*1024||!["image/png","image/jpeg","image/webp"].includes(file.type))throw Error("Use a PNG, JPEG or WebP screenshot up to 2 MB.");

     const sharp=(await import("sharp")).default;

     const bytes=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:16000000}).resize({width:2000,height:2000,fit:"inside",withoutEnlargement:true}).png().toBuffer();

     attachment=`${id}/${findingId}.png`;

     const r=await fetch(getSupabaseRestUrl(`/storage/v1/object/course-review-evidence/${attachment}`)!,{method:"POST",headers:{"content-type":"image/png",apikey:process.env.SUPABASE_SERVICE_ROLE_KEY!,authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`},body:new Uint8Array(bytes),cache:"no-store"});

     if(!r.ok)throw Error("Screenshot could not be saved. Keep a local copy and try again.");

    }

    d.findings.push({id:findingId,unit,reference,category:text(form,"category",2,80),blocking:form.get("blocking")==="on",author:email,userId:session.user.id,at:now,text:text(form,"comment",3),attachment,status:"open",replies:[]});

   }else if(op==="reply"||op==="fixed"||op==="close"){

    const f=d.findings.find(f=>f.id===text(form,"finding_id"));if(!f)throw Error("Finding unavailable.");

    const comment=text(form,"comment",3);

    if(op==="fixed"){f.status="fixed";f.fixedBy=session.user.id;}

    if(op==="close"){if(f.status!=="fixed"||f.fixedBy===session.user.id)throw Error("A different reviewer must verify a finding marked fixed.");f.status="closed";}

    f.replies.push({email,userId:session.user.id,at:now,text:`${op}: ${comment}`});

   }else if(op==="coverage"){

    const unit=text(form,"unit");if(!d.units.some(u=>u.slug===unit)||form.get("confirm_coverage")!=="on")throw Error("Confirm you reviewed this complete LU, including its quizzes or tests.");

    person.coverage=[...new Set([...person.coverage,unit])];

   }else if(op==="report"){

    if(person.role!=="primary")throw Error("Peer-only checkers endorse reports or finish their peer task.");

    if(!d.units.every(u=>person.coverage.includes(u.slug)))throw Error("Confirm coverage for every LU and assessment before committing your full report.");

    const report={id:randomUUID(),email,userId:session.user.id,at:now,text:text(form,"comment",5)+"\n\nFindings at submission:\n"+d.findings.map(f=>`${f.id} | ${f.unit} | ${f.reference} | ${f.author} | ${f.blocking?"BLOCKING":"Suggestion"} | ${f.status}\n${f.text}`).join("\n\n"),coverage:[...person.coverage],endorsements:[]};

    d.reports.push(report);person.state="finished";

    mail=reviewMail(round,"report_submitted",report.id,`${email} committed review report ${report.id}. A new version requires fresh endorsement.\n\n${report.text}`);

   }else if(op==="reopen_report"){

    if(person.role!=="primary"||person.state!=="finished")throw Error("Only your own submitted report can be revised.");

    person.state="active";

    notice="Your next report will be a new version and need fresh endorsement. Previous versions remain in the audit trail.";

   }else if(op==="endorse"){

    const report=d.reports.find(r=>r.id===text(form,"report_id"));

    if(!report||currentReport(d,report.email)?.id!==report.id)throw Error("Choose the latest committed report.");

    if(report.userId===session.user.id||report.email===email)throw Error("You cannot endorse your own report.");

    if(report.endorsements.some(e=>e.userId===session.user.id))throw Error("Your decision is committed. A revised report needs a new decision.");

    const decision=text(form,"decision");if(decision!=="approve"&&decision!=="changes")throw Error("Choose an endorsement decision.");

    const comment=text(form,"comment",3);

    report.endorsements.push({email,userId:session.user.id,at:now,decision,text:comment});

    mail=reviewMail(round,"peer_decision",`${report.id}:${session.user.id}`,`${email} ${decision==="approve"?"endorsed":"requested changes to"} ${report.email}'s report ${report.id}:\n${comment}\nReport endorsement is separate from course publication.`);

   }else if(op==="finish_peer"){

    if(person.role!=="peer"||!d.reports.some(r=>r.endorsements.some(e=>e.userId===session.user.id)))throw Error("Record at least one report decision before finishing your peer task.");person.state="finished";

   }else if(op==="decline"){

    if(person.state==="finished")throw Error("A committed review cannot be declined. Ask the requester to revise the team.");

    person.state="declined";person.reason=text(form,"comment",5);

    mail=reviewMail(round,"review_declined",`decline:${email}`,`${email} declined: ${person.reason}. Acknowledge or replace this reviewer; decline is not approval.`,[d.requester]);

   }else if(op==="terms"){

    if(!d.terms.partner||d.terms.acceptor!==email)throw Error("Only the named company signatory can decide these terms.");

    const membership=await rows<{user_id:string}>(`/rest/v1/organisation_memberships?organisation_id=eq.${round.organisation_id}&user_id=eq.${session.user.id}&membership_role=eq.owner&is_active=eq.true&select=user_id`);

    if(!membership.length)throw Error("APGI must appoint you as this company's business owner before you can decide its terms.");

    if(d.terms.decision)throw Error("This decision is committed. Changed terms require a new commercial plan and review.");

    const decision=text(form,"decision");if(!["accepted","rejected"].includes(decision))throw Error("Choose accept or reject.");

    if(form.get("confirm_terms")!=="on")throw Error("Confirm you have read this exact company commercial schedule.");

    d.terms={...d.terms,decision:decision as "accepted"|"rejected",at:now,userId:session.user.id,reason:text(form,"comment",5)};

    mail=reviewMail(round,"company_terms_decision",`terms:${round.revision}`,`${email} ${decision} the company terms: ${d.terms.reason}`,[d.requester]);

   }else throw Error("Choose a valid review action.");

   reviewEvent(d,email,op,formText(form,"comment",0,5000)||formText(form,"unit")||"Recorded by signed-in reviewer");

  }

  await commitReview(round,session.user.id,op,mail);

  try{if(mail.length)await processReviewMail();}catch{/* Durable failed/pending delivery remains visible. */}

  revalidatePath(`/course-reviews/${id}`);revalidatePath("/course-reviews");return {success:notice};

 }catch(e){if(e instanceof Error&&"digest" in e)throw e;return {error:e instanceof Error?e.message:"Review action could not be saved."};}

}

