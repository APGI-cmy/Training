import {WorkflowFrame} from "@/components/reviews/WorkflowGuide";
import {publicationGuide} from "@/lib/publication-guide";
import {hasReviewTask,assignedTasks,reviewTaskLabels,companyBrandApproved} from "@/lib/review-tasks";
import Link from "next/link";
import {requireReview} from "@/server/services/course-reviews";
import {currentCommercial} from "@/lib/publication-workflow";
import { currentRateCatalogue } from "@/server/services/service-rate-register";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { accessibleCompanies, rows } from "@/server/services/company-structure";
import { getCourseBySlug, getCourses } from "@/lib/courses";
import type { DraftRecord } from "@/lib/company-structure";
import { CoursePlanForm } from "@/components/admin/CoursePlanForm";
export default async function PublicationPreparation({params,searchParams}: {
  params: Promise<{courseSlug:string}>;searchParams:Promise<{brand?:string;review?:string}>;
}) {
  await requireAdmin();let principal;try { principal=await requirePlatformPrincipal(); } catch { notFound(); }
  const [{courseSlug},query]=await Promise.all([params,searchParams]);
  const course=getCourseBySlug(courseSlug);if(!course)notFound();
  if(!query.review)return <main className="admin-page"><h1>{course.title}</h1><p>Begin with course content review and approval. The same workflow then unlocks commercial preparation, joint APGI sign-off and publication.</p><Link className="primary-button" href={`/course-reviews/new?course=${course.slug}`}>Start content-first publication workflow</Link><p><Link href="/course-reviews">Continue an existing workflow</Link></p></main>;
  const {round,fresh,source,email}=await requireReview(query.review),workflow=round.document.workflow;
  if(round.course_id!==courseSlug||(!workflow||(!workflow.commercialPreparation&&!workflow.contentApproval))||!fresh||!["commercial_draft","negotiation"].includes(workflow.stage))return <WorkflowFrame steps={publicationGuide(round,source.fingerprint,source.brand.brand_revision,email,"commercials")}><main className="admin-page"><h1>Commercial preparation is locked</h1><p>Submit the requester review and open commercial preparation, or continue the current commercial decision in the workflow.</p><Link href={`/course-reviews/${round.id}`}>Continue publication workflow</Link></main></WorkflowFrame>;
  const previous=currentCommercial(workflow);
  const context={id:round.id,ownerId:workflow.ownerId,designerName:workflow.designerName,designerCompany:workflow.designerCompany,configuration:previous?.configuration};
  const [companies,profiles,catalogue]=await Promise.all([accessibleCompanies(),rows<DraftRecord>("/rest/v1/commercial_agreement_drafts?kind=eq.operating_cost&organisation_id=is.null&select=*&order=created_at.desc&limit=100"),currentRateCatalogue()]);
  return <WorkflowFrame steps={publicationGuide(round,source.fingerprint,source.brand.brand_revision,email,"commercials")}><main className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">Publication preparation</p><h1>{course.title}</h1><p>Content findings and independent checks may still be in progress. Prepare the commercial version, then return for separate sign-off by both Johan and Jorrie. Saving changes no learner access or payment settings.</p></div></header><section className="admin-form-card"><CoursePlanForm catalogue={catalogue} principalId={principal.session.user.id} initialCourse={courseSlug} initialBrand={round.organisation_id} workflowContext={context} companies={companies.map(c=>({id:c.id,name:c.name,slug:c.slug}))} courses={getCourses().map(c=>({slug:c.slug,title:c.title}))} costProfiles={profiles.filter(p=>p.configuration.planning_version==="1").map(p=>({id:p.id,title:p.title,configuration:p.configuration}))}/></section></main></WorkflowFrame>;
}
