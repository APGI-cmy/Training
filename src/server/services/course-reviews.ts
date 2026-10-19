import "server-only";

import {createHash,randomUUID} from "node:crypto";

import {redirect} from "next/navigation";

import {getCurrentSession,getSupabaseRestUrl} from "@/server/auth/session";

import {adminRest} from "@/server/supabase/admin-rest";

import {rows,write} from "./company-structure";

import {isPlatformPrincipal} from "./platform-principals";

import {getCourseBySlug} from "@/lib/courses";

import {validId,type DraftRecord,type CompanyRecord} from "@/lib/company-structure";

import {canWork,currentReport,needsReminder,normalizedEmail,progressText,reviewBlockers,type ReviewRound,type ReviewDocument} from "@/lib/course-review";

import manifest from "@/data/course-review-manifest.json";

import {getCourseCover} from "@/lib/course-covers";

import {deliverTransactionalEmail} from "./email/transactional-delivery";

export const reviewHash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function contentSource(courseId:string,organisationId:string) {

 validId(organisationId);const course=getCourseBySlug(courseId);

 const brand=(await rows<CompanyRecord>(`/rest/v1/organisations?id=eq.${organisationId}&is_active=eq.true&select=*&limit=1`))[0];

 if(!course||!brand)throw Error("Course or brand is unavailable.");

 const assets=(manifest as Record<string,unknown>)[course.slug];if(!assets)throw Error("Course review assets are unavailable. Rebuild before review.");

 return {course,brand,fingerprint:reviewHash({assets,source:manifest.source,course})};

}

export async function reviewSource(planId:string) {

 validId(planId);

 const plan=(await rows<DraftRecord>(`/rest/v1/commercial_agreement_drafts?id=eq.${planId}&select=*&limit=1`))[0];

 if(!plan||plan.kind!=="course_agreement"||!plan.organisation_id||!plan.course_id)throw Error("Choose a saved course agreement first.");

 const course=getCourseBySlug(plan.course_id);

 const brand=(await rows<CompanyRecord>(`/rest/v1/organisations?id=eq.${plan.organisation_id}&is_active=eq.true&select=*&limit=1`))[0];

 if(!course||!brand)throw Error("Course or brand is unavailable.");

 const assets=(manifest as Record<string,unknown>)[course.slug];if(!assets)throw Error("Course review asset manifest is unavailable; rebuild the course before requesting review.");

 return {plan,course,brand,fingerprint:reviewHash({assets,source:manifest.source,course,configuration:plan.configuration,brand})};

}

export async function reviewSession(path="/course-reviews") {

 const session=await getCurrentSession();

 if(!session)redirect(`/alp-sign-in?next=${encodeURIComponent(path)}`);

 if(!session.user.email_confirmed_at||!session.user.email)throw Error("Confirm your email before joining a review.");

 return {session,email:normalizedEmail(session.user.email),principal:await isPlatformPrincipal(session)};

}

export async function requireReview(id:string) {

 validId(id);const actor=await reviewSession(`/course-reviews/${id}`);

 const round=(await rows<ReviewRound>(`/rest/v1/course_review_rounds?id=eq.${id}&select=*&limit=1`))[0];

 if(!round||(!actor.principal&&!round.document.participants.some(p=>p.email===actor.email)))throw Error("This review is available only to its assigned team. Sign in with the invited email address.");

 const source=round.document.workflow?await contentSource(round.course_id,round.organisation_id):await reviewSource(round.plan_id!);

 return {...actor,round,source,fresh:source.fingerprint===round.fingerprint};

}

export type ReviewMail={key:string;to:string;kind:string;subject:string;body:string};

export function reviewMail(round:ReviewRound,kind:string,key:string,body:string,to?:string[]):ReviewMail[] {

 const d=round.document;

 return (to??d.participants.filter(p=>p.state!=="declined").map(p=>p.email)).map(email=>({key:`${round.id}:${key}:${email}`,to:email,kind,subject:`${d.brand.name} — ${d.title}: ${kind.replaceAll("_"," ")}`,body:`${body}\n\n${progressText(round)}\n\nSign in with ${email}: ${process.env.NEXT_PUBLIC_APP_URL}/course-reviews/${round.id}\nHosted by APGI`}));

}

export async function commitReview(round:ReviewRound,actorId:string|null,action:string,mail:ReviewMail[]=[]){

 const r=await adminRest("/rest/v1/rpc/v2_commit_course_review",{method:"POST",body:JSON.stringify({p_id:round.id,p_revision:round.revision,p_document:round.document,p_actor:actorId,p_action:action,p_mail:mail})});

 if(!r.ok)throw Error("Another reviewer saved a change. Reload this page before submitting again; your earlier saved evidence is safe.");

 round.revision=await r.json();

}

export function reviewEvent(doc:ReviewDocument,email:string,action:string,detail:string) {doc.events.push({actor:email,at:new Date().toISOString(),action,detail});}

export function claimReviewer(round:ReviewRound,email:string,userId:string){

 const person=round.document.participants.find(p=>p.email===email);

 if(!person||person.state==="declined")throw Error("You are not an active assigned reviewer.");

 if(person.userId&&person.userId!==userId)throw Error("The reviewer account does not match the bound identity.");

 if(round.document.participants.some(p=>p.email!==email&&p.userId===userId))throw Error("Each reviewer must use a different account.");

 person.userId=userId;if(person.state==="invited")person.state="active";return person;

}

export function assertReviewWork(round:ReviewRound,fresh:boolean){

 if(!fresh)throw Error("The course content changed. The requester must start a new round; existing evidence remains available.");

 if(!canWork(round))throw Error("This review is closed or overdue. The requester must extend the cutoff before more work can be submitted.");

}

type MailRow={id:string;round_id:string;notification_key:string;recipient:string;kind:string;subject:string;body:string};

const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));

export async function processReviewMail(){

 const claimed=await adminRest("/rest/v1/rpc/v2_claim_review_mail",{method:"POST",body:"{}"});

 if(!claimed.ok)throw Error("Review email queue unavailable.");

 const batch=await claimed.json() as MailRow[];let sent=0;

 for(const m of batch){

  const round=(await rows<ReviewRound>(`/rest/v1/course_review_rounds?id=eq.${m.round_id}&select=*&limit=1`))[0];

  const person=round?.document.participants.find(p=>p.email===m.recipient);
  const currentOffer=round?.document.workflow?.commercials.at(-1);
  const staleOffer=m.kind==="partner_offer"&&(!currentOffer||!m.notification_key.includes(currentOffer.id)||round?.document.workflow?.stage!=="partner_offer");

  // Re-evaluate at send time: queued reminders cannot outlive their task/cutoff.

  if(!round||staleOffer||round.status==="cancelled"||((m.kind==="reminder"||m.kind==="invitation")&&(!person||!needsReminder(round,person)))||(m.kind==="progress_digest"&&round.status!=="open")){

   await write(`/rest/v1/course_review_mail?id=eq.${m.id}`,{state:"skipped"},"PATCH");continue;

  }

  const d=round.document;

  const image=getCourseCover(round.course_id)?.src;

  const logo=d.brand.logo?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${d.brand.logo}`):`${process.env.NEXT_PUBLIC_APP_URL}/branding/apgi-logo.png`;

  const join=m.body.split(/\s+/).find(s=>s.startsWith(`${process.env.NEXT_PUBLIC_APP_URL}/course-reviews/${round.id}/join/`));

  const reviewAnchor=["review_change_requested","review_change_decided"].includes(m.kind)?"#manage-request":"";
  const body=m.body.length>100000?m.body.slice(0,100000)+"\nFull committed report is available in the secure review workspace.":m.body;

  const result=await deliverTransactionalEmail({to:m.recipient,subject:m.subject,text:body,html:`<div style="max-width:640px;margin:auto;font:16px Arial;color:#102b47">${logo?`<img alt="${escape(d.brand.name)}" width="150" src="${escape(logo)}"/>`:""}<h2>${escape(d.brand.name)}</h2>${image?`<img alt="Course" style="width:100%;max-height:180px;object-fit:cover" src="${process.env.NEXT_PUBLIC_APP_URL}${image}"/>`:""}<h3>${escape(d.title)}</h3><div style="white-space:pre-line">${escape(body)}</div><p><a style="display:inline-block;padding:14px;background:${/^#[a-f0-9]{6}$/i.test(d.brand.color)?d.brand.color:"#102b47"};color:white" href="${process.env.NEXT_PUBLIC_APP_URL}/course-reviews/${round.id}${reviewAnchor}">Open course review</a></p>${join?`<p><a href="${escape(join)}">First time on V2? Create your review account</a></p>`:""}<small>Hosted by APGI</small></div>`,idempotencyKey:reviewHash(m.notification_key)});

  await write(`/rest/v1/course_review_mail?id=eq.${m.id}`,result.ok?{state:"sent",provider_id:result.providerMessageId,last_error:null}:{state:"failed",last_error:result.error},"PATCH");

  if(result.ok)sent++;

 }

 return {processed:batch.length,sent};

}

export async function dailyReviewMail(){

 const rounds=await rows<ReviewRound>("/rest/v1/course_review_rounds?status=eq.open&select=*&order=created_at.asc");

 const now=new Date(),day=now.toLocaleDateString("en-CA",{timeZone:"Africa/Johannesburg"}),hour=Number(now.toLocaleString("en-GB",{hour:"2-digit",hourCycle:"h23",timeZone:"Africa/Johannesburg"}));

 for(const round of rounds){

  const d=round.document,overdue=!canWork(round)&&d.participants.some(p=>p.state!=="finished"&&p.state!=="declined");

  const mail:ReviewMail[]=[];

  if(hour>=9||overdue){

   for(const p of d.participants)if(needsReminder(round,p))mail.push(...reviewMail(round,"reminder",`reminder:${day}`,"Your course-review task is outstanding. Submit your report or record a decline. Opening this message is not approval.",[p.email]));

   mail.push(...reviewMail(round,"progress_digest",`digest:${day}`,overdue?"Unfinished work is OVERDUE. An explicit extension is required; nothing was approved automatically.":"Daily course-review progress summary.",[d.requester]));

  }

  if(mail.length){const existing=await rows<{notification_key:string}>(`/rest/v1/course_review_mail?round_id=eq.${round.id}&notification_key=like.*${day}*&select=notification_key`);const keys=new Set(existing.map(m=>m.notification_key));const freshMail=mail.filter(m=>!keys.has(m.key));if(freshMail.length)await commitReview(round,null,"daily_notification_queue",freshMail);}

 }

 return processReviewMail();

}

export async function publishReview(round:ReviewRound,actorId:string,fingerprint:string,brandRevision=round.document.brand.revision){

 const blockers=reviewBlockers(round,fingerprint,brandRevision);if(blockers.length)throw Error(blockers.join(" "));

 const r=await adminRest("/rest/v1/rpc/v2_publish_reviewed_course",{method:"POST",body:JSON.stringify({p_id:round.id,p_revision:round.revision,p_actor:actorId,p_fingerprint:fingerprint})});

 if(!r.ok)throw Error("Publication was blocked. Refresh and check the review, brand and commercial approvals.");

}

