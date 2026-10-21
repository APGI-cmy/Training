import {WorkflowFrame} from "@/components/reviews/WorkflowGuide";
import {setupGuide} from "@/lib/publication-guide";
import Link from "next/link";

import {requirePlatformPrincipal} from "@/server/services/platform-principals";

import {reviewSource} from "@/server/services/course-reviews";

import {accessibleCompanies} from "@/server/services/company-structure";

import {getCourseBySlug,getCourses} from "@/lib/courses";

import {RequestReviewForm} from "@/components/reviews/ReviewForms";

import "../reviews.css";

export const dynamic="force-dynamic";

export default async function NewReview({searchParams}:{searchParams:Promise<{plan?:string;course?:string;brand?:string}>}){

 const {session}=await requirePlatformPrincipal(),q=await searchParams;

 const old=q.plan?await reviewSource(q.plan):undefined,course=getCourseBySlug(q.course||old?.course.slug||""),companies=await accessibleCompanies();

 return <WorkflowFrame steps={setupGuide()}><main className="review-page"><p className="eyebrow">1. Course preview and content review</p><h1>Start course publication</h1><p>Review and approve course content first. Commercials follow, with separate sign-off by both Johan and Jorrie, company acceptance where applicable, and final APGI publication.</p>{course?<><h2>{course.title}</h2><Link href={`/admin/courses/${course.slug}/preview`}>Preview the complete course</Link><p><Link href={`/admin/companies?returnTo=${encodeURIComponent(`/course-reviews/new?course=${course.slug}`)}`}>Add a new brand, then return here</Link></p><RequestReviewForm courseId={course.slug} email={session.user.email!} companies={companies.map(c=>({id:c.id,name:c.name,slug:c.slug}))} initialBrand={q.brand||old?.brand.id} initialCredits={old?Object.fromEntries(Object.entries(old.plan.configuration).filter((entry):entry is [string,string]=>typeof entry[1]==="string")):undefined}/></>:getCourses().map(c=><section className="review-box" key={c.slug}><h2>{c.title}</h2><Link href={`/course-reviews/new?course=${c.slug}`}>Start content review</Link></section>)}<p><Link href="/admin/companies">Create a brand separately</Link></p></main></WorkflowFrame>;

}

