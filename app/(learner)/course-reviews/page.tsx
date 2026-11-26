import {getTenantCourses,productionCompanyId} from '@/server/services/tenant-courses';

import Link from "next/link";

import {rows} from "@/server/services/company-structure";

import {reviewSession} from "@/server/services/course-reviews";

import type {ReviewRound} from "@/lib/course-review";
import {summarizeReviewWorkflows,type ReviewOffering} from '@/lib/review-workflow-summary';
import {ReviewWorkflowCard,SharedPublicationLinks,type SharedPublication} from '@/components/course/ReviewWorkflowCard';

import "./reviews.css";
import {CoursePublicationBadge} from '@/components/course/CoursePublicationBadge';
import {getPublishedCourseIds} from '@/server/services/course-publication-status';
import {receivedPublishedShares} from '@/server/services/course-distribution';

export const dynamic="force-dynamic";

export default async function ReviewsPage(){

 const actor=await reviewSession();

 const company=productionCompanyId();
 const shared=await receivedPublishedShares(company,actor.principal&&!company);
 const sharedCompanies=shared.length?await rows<{id:string;name:string}>(`/rest/v1/organisations?id=in.(${[...new Set(shared.map(s=>s.recipient_organisation_id))].join(',')})&select=id,name`):[];
 const rounds=await rows<ReviewRound>(`/rest/v1/course_review_rounds?select=*&order=created_at.desc${company?`&organisation_id=eq.${company}`:''}${actor.principal?"":`&document->participants=cs.${encodeURIComponent(JSON.stringify([{email:actor.email}]))}`}`);
 const courses=await getTenantCourses(),published=actor.principal?await getPublishedCourseIds(courses.map(c=>c.id)):null;
 const visible=company?rounds.filter(r=>courses.some(c=>c.id===r.course_id)):rounds;
 let offerings:ReviewOffering[]|null=[];
 if(visible.length){try{offerings=await rows<ReviewOffering>(`/rest/v1/organisation_offerings?select=organisation_id,course_id,status,reviewed_release_id&organisation_id=in.(${[...new Set(visible.map(r=>r.organisation_id))].join(',')})&course_id=in.(${[...new Set(visible.map(r=>r.course_id))].map(id=>encodeURIComponent('"'+id.replaceAll('"','\\"')+'"')).join(',')})`);}catch{offerings=null;}}
 const summaries=summarizeReviewWorkflows(visible.filter(r=>!shared.some(s=>s.course_id===r.course_id&&s.recipient_organisation_id===r.organisation_id)),offerings);
 const unstarted=courses.filter(c=>!summaries.some(s=>s.current.course_id===c.id)&&!shared.some(s=>s.course_id===c.id));
 const sharesByRelease=new Map<string,typeof shared>();
 for(const share of shared){
  const group=sharesByRelease.get(share.source_release_id)??[];
  group.push(share);
  sharesByRelease.set(share.source_release_id,group);
 }
 const companyNames=new Map(sharedCompanies.map(entry=>[entry.id,entry.name]));
 const shareLinks=(group:typeof shared):SharedPublication[]=>group.map(share=>({
  id:share.id,
  companyId:share.recipient_organisation_id,
  companyName:companyNames.get(share.recipient_organisation_id)??'Partner platform',
 }));
 const visibleReleaseIds=new Set(summaries.flatMap(summary=>summary.publishedRelease?[summary.publishedRelease.id]:[]));
 const sharesWithoutWorkflow=[...sharesByRelease].filter(([releaseId])=>!visibleReleaseIds.has(releaseId));

 return <main className="review-page">
  <p className="eyebrow">Content review → Commercial approval → Company acceptance → Publication</p>
  <h1>Course reviews and publication</h1>
  <p><Link className="primary-button" href="/review-requests?kind=content">Submit for review / assign reviewers</Link> · <Link href="/review-requests">All four review types and request history</Link></p>
  <p>Partner links appear under their published owner release. Earlier releases remain in the course’s history.</p>
  {actor.principal&&unstarted.length?<section className="review-box">
   <h2>Start with a course preview</h2>
   {unstarted.map(c=><p key={c.slug}><CoursePublicationBadge published={published?.has(c.id)??null}/> <strong>{c.title}</strong> · <Link href={`/admin/courses/${c.slug}/preview`}>Preview course</Link> · <Link href={`/course-reviews/new?course=${c.slug}`}>Start publication workflow</Link></p>)}
  </section>:null}
  {summaries.map(summary=><ReviewWorkflowCard
   key={summary.key}
   summary={summary}
   shares={shareLinks(sharesByRelease.get(summary.publishedRelease?.id??'')??[])}
  />)}
  {sharesWithoutWorkflow.map(([releaseId,group])=>{
   const courseId=group[0].course_id;
   return <article className="review-box" key={releaseId}>
    <h2>{courses.find(course=>course.id===courseId)?.title??courseId}</h2>
    <CoursePublicationBadge published={true}/>
    <SharedPublicationLinks shares={shareLinks(group)}/>
   </article>;
  })}
  {!summaries.length&&!shared.length?<p>No course reviews are assigned to this account yet.</p>:null}
 </main>;

}

