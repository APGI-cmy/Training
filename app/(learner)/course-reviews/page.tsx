import Link from "next/link";
import {rows} from "@/server/services/company-structure";
import {reviewSession} from "@/server/services/course-reviews";
import {canWork,type ReviewRound} from "@/lib/course-review";
import "./reviews.css";
export const dynamic="force-dynamic";
export default async function ReviewsPage(){
 const actor=await reviewSession();
 const rounds=await rows<ReviewRound>(`/rest/v1/course_review_rounds?select=*&order=created_at.desc${actor.principal?"":`&document->participants=cs.${encodeURIComponent(JSON.stringify([{email:actor.email}]))}`}`);
 return <main className="review-page"><p className="eyebrow">Course preparation · steps 5–7</p><h1>Course reviews and publication</h1><p>Review published learning units and quizzes together. Report endorsement and final course publication are separate decisions.</p>{actor.principal?<Link href="/admin/agreements">Prepare or select a saved course plan</Link>:null}{!rounds.length?<p>No course reviews are assigned to this account yet.</p>:rounds.map(r=><article className="review-box" key={r.id}><h2>{r.document.title}</h2><p>{r.document.brand.name} · {r.status}{r.status==="open"&&!canWork(r)?" · Cutoff reached — unfinished tasks overdue":""}</p><p>Cutoff: {new Date(r.document.cutoff).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"})} SAST</p><Link className="primary-button" href={`/course-reviews/${r.id}`}>Open team review</Link></article>)}</main>;
}
