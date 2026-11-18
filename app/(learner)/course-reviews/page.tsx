import {getTenantCourses,productionCompanyId} from '@/server/services/tenant-courses';

import Link from "next/link";

import {rows} from "@/server/services/company-structure";

import {reviewSession} from "@/server/services/course-reviews";

import type {ReviewRound} from "@/lib/course-review";
import {summarizeReviewWorkflows,type ReviewOffering} from '@/lib/review-workflow-summary';
import {ReviewWorkflowCard} from '@/components/course/ReviewWorkflowCard';

import "./reviews.css";
import {CoursePublicationBadge} from '@/components/course/CoursePublicationBadge';
import {getPublishedCourseIds} from '@/server/services/course-publication-status';

export const dynamic="force-dynamic";

export default async function ReviewsPage(){

 const actor=await reviewSession();

 const company=productionCompanyId();
 const rounds=await rows<ReviewRound>(`/rest/v1/course_review_rounds?select=*&order=created_at.desc${company?`&organisation_id=eq.${company}`:''}${actor.principal?"":`&document->participants=cs.${encodeURIComponent(JSON.stringify([{email:actor.email}]))}`}`);
 const courses=await getTenantCourses(),published=actor.principal?await getPublishedCourseIds(courses.map(c=>c.id)):null;
 const visible=company?rounds.filter(r=>courses.some(c=>c.id===r.course_id)):rounds;
 let offerings:ReviewOffering[]|null=[];
 if(visible.length){try{offerings=await rows<ReviewOffering>(`/rest/v1/organisation_offerings?select=organisation_id,course_id,status,reviewed_release_id&organisation_id=in.(${[...new Set(visible.map(r=>r.organisation_id))].join(',')})&course_id=in.(${[...new Set(visible.map(r=>r.course_id))].map(id=>encodeURIComponent('"'+id.replaceAll('"','\\"')+'"')).join(',')})`);}catch{offerings=null;}}
 const summaries=summarizeReviewWorkflows(visible,offerings);
 const unstarted=courses.filter(c=>!summaries.some(s=>s.current.course_id===c.id));

 return <main className="review-page"><p className="eyebrow">Content review → Commercial approval → Company acceptance → Publication</p><h1>Course reviews and publication</h1><p><Link className="primary-button" href="/review-requests?kind=content">Submit for review / assign reviewers</Link> · <Link href="/review-requests">All four review types and request history</Link></p><p>One workflow per course and company. Published training stays available while its retained review continues. Earlier releases remain in the course’s history.</p>{actor.principal&&unstarted.length?<section className="review-box"><h2>Start with a course preview</h2>{unstarted.map(c=><p key={c.slug}><CoursePublicationBadge published={published?.has(c.id)??null}/> <strong>{c.title}</strong> · <Link href={`/admin/courses/${c.slug}/preview`}>Preview course</Link> · <Link href={`/course-reviews/new?course=${c.slug}`}>Start publication workflow</Link></p>)}</section>:null}{!summaries.length?<p>No course reviews are assigned to this account yet.</p>:summaries.map(summary=><ReviewWorkflowCard key={summary.key} summary={summary}/>)}</main>;

}

