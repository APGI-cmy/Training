import {getCourses} from "@/lib/courses";

import Link from "next/link";

import {rows} from "@/server/services/company-structure";

import {reviewSession} from "@/server/services/course-reviews";

import {canWork,type ReviewRound} from "@/lib/course-review";

import "./reviews.css";

export const dynamic="force-dynamic";

export default async function ReviewsPage(){

 const actor=await reviewSession();

 const rounds=await rows<ReviewRound>(`/rest/v1/course_review_rounds?select=*&order=created_at.desc${actor.principal?"":`&document->participants=cs.${encodeURIComponent(JSON.stringify([{email:actor.email}]))}`}`);

 return <main className="review-page"><p className="eyebrow">Content review → Commercial approval → Company acceptance → Publication</p><h1>Course reviews and publication</h1><p>Review published learning units and quizzes together. Report endorsement and final course publication are separate decisions.</p>{actor.principal?<section className="review-box"><h2>Start with a course preview</h2>{getCourses().map(c=><p key={c.slug}><strong>{c.title}</strong> · <Link href={`/admin/courses/${c.slug}/preview`}>Preview course</Link> · <Link href={`/course-reviews/new?course=${c.slug}`}>Start publication workflow</Link></p>)}</section>:null}{!rounds.length?<p>No course reviews are assigned to this account yet.</p>:rounds.map(r=><article className="review-box" key={r.id}><h2>{r.document.title}</h2><p>{r.document.brand.name} · {r.status}{r.status==="open"&&(!r.document.workflow||r.document.workflow.stage==="content_review")&&!canWork(r)?" · Cutoff reached — unfinished tasks overdue":""}</p><p>Current step: <strong>{r.document.workflow?.stage.replaceAll("_"," ")??"Earlier review"}</strong></p><p>Cutoff: {new Date(r.document.cutoff).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"})} SAST</p><Link className="primary-button" href={`/course-reviews/${r.id}`}>Continue workflow</Link></article>)}</main>;

}

