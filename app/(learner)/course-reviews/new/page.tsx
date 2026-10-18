import Link from "next/link";
import {notFound} from "next/navigation";
import {requirePlatformPrincipal} from "@/server/services/platform-principals";
import {reviewSource} from "@/server/services/course-reviews";
import {RequestReviewForm} from "@/components/reviews/ReviewForms";
import "../reviews.css";
export const dynamic="force-dynamic";
export default async function NewReview({searchParams}:{searchParams:Promise<{plan?:string}>}){
 const {session}=await requirePlatformPrincipal(),{plan}=await searchParams;if(!plan)notFound();const source=await reviewSource(plan);
 return <main className="review-page"><ol className="review-steps"><li>1–4. Saved course and commercials</li><li aria-current="step">5. Request review</li><li>6. Team review</li><li>7. Publish</li></ol><h1>Request course review</h1><h2>{source.course.title} · {source.brand.name}</h2><p>Saved plan: {source.plan.title}. Designer: {source.plan.configuration.designer_name??"Not recorded"} · {source.plan.configuration.designer_company??"Not recorded"}.</p><p className="review-meta">Review source version: {source.fingerprint}</p><p>The content, brand and commercial version are recorded now. A changed version requires a new round. No course is published by this request.</p>{source.plan.configuration.designer_name&&source.plan.configuration.designer_company?<RequestReviewForm planId={plan} email={session.user.email!} apgi={source.brand.slug==="apgi"}/>:<section className="review-box"><h2>Add the missing design credits first</h2><p>This earlier saved plan has no designer name or company. Open the course wizard, add those credits and save a new version. Your earlier plan stays unchanged.</p><Link className="primary-button" href={`/admin/courses/${source.course.slug}/publish`}>Complete designer credits in the course wizard</Link></section>}</main>;
}
