import { currentRateCatalogue } from "@/server/services/service-rate-register";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { accessibleCompanies, rows } from "@/server/services/company-structure";
import { getCourseBySlug, getCourses } from "@/lib/courses";
import type { DraftRecord } from "@/lib/company-structure";
import { CoursePlanForm } from "@/components/admin/CoursePlanForm";
export default async function PublicationPreparation({params,searchParams}: {
  params: Promise<{courseSlug:string}>;searchParams:Promise<{brand?:string}>;
}) {
  await requireAdmin();let principal;try { principal=await requirePlatformPrincipal(); } catch { notFound(); }
  const [{courseSlug},query]=await Promise.all([params,searchParams]);
  const course=getCourseBySlug(courseSlug);if(!course)notFound();
  const [companies,profiles,catalogue]=await Promise.all([accessibleCompanies(),rows<DraftRecord>("/rest/v1/commercial_agreement_drafts?kind=eq.operating_cost&organisation_id=is.null&select=*&order=created_at.desc&limit=100"),currentRateCatalogue()]);
  return <main className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">Publication preparation</p><h1>{course.title}</h1><p>Prepare the course and terms in draft. Learner access remains unchanged until controlled publication is implemented and approved.</p></div></header><section className="admin-form-card"><CoursePlanForm catalogue={catalogue} principalId={principal.session.user.id} initialCourse={courseSlug} initialBrand={companies.some(c=>c.id===query.brand)?query.brand:""} companies={companies.map(c=>({id:c.id,name:c.name,slug:c.slug}))} courses={getCourses().map(c=>({slug:c.slug,title:c.title}))} costProfiles={profiles.filter(p=>p.configuration.planning_version==="1").map(p=>({id:p.id,title:p.title,configuration:p.configuration}))}/></section></main>;
}
