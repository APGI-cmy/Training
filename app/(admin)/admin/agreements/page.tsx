import {SummaryText} from "@/components/shared/SummaryText";
import { currentRateCatalogue } from "@/server/services/service-rate-register";
import Link from "next/link";
import { SavedServiceCosts } from "@/components/admin/SavedServiceCosts";
import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { requireAdmin } from "@/lib/auth/require-admin";
import { notFound } from "next/navigation";
import { accessibleCompanies, rows } from "@/server/services/company-structure";
import { CoursePlanForm } from "@/components/admin/CoursePlanForm";
import { type DraftRecord } from "@/lib/company-structure";
import { getCourses } from "@/lib/courses";
export default async function AgreementsPage() {
  await requireAdmin();
  let principal; try { principal = await requirePlatformPrincipal(); } catch { notFound(); }
  const [companies, drafts, catalogue] = await Promise.all([accessibleCompanies(),rows<DraftRecord>("/rest/v1/commercial_agreement_drafts?select=*&order=created_at.desc&limit=100"),currentRateCatalogue()]);
  const profiles=drafts.filter(d=>d.kind==="operating_cost"&&d.configuration.planning_version==="1");
  return <main className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">Course publication planning</p><h1>Course and partner agreements</h1><p>Prepare the course, brand, development position and minimum income in guided steps. Partner terms present the platform as APGI.</p></div></header>
    <nav className="planning-controls"><Link href="/course-reviews">Course reviews and publication</Link><Link href="/admin/service-costs">Service cost register</Link><Link href="/admin/agreements/internal">Private APGI/SRMS settings</Link><Link href="/admin/policies">Policies and signed versions</Link></nav>
    <section className="admin-form-card"><h2>Prepare a course agreement</h2><CoursePlanForm catalogue={catalogue} principalId={principal.session.user.id} companies={companies.map(c=>({id:c.id,name:c.name,slug:c.slug}))} courses={getCourses().map(c=>({slug:c.slug,title:c.title,shareable:c.catalogueVisibility!=="client_specific"}))} costProfiles={profiles.map(p=>({id:p.id,title:p.title,configuration:p.configuration}))}/></section>
    <section className="directory-card"><h2>Saved course plans</h2><p>Drafts do not publish a course, send an invitation or activate financial terms.</p>{drafts.filter(d=>d.kind==="course_agreement").map(d=><article className="draft-summary" key={d.id}><strong>{d.title} · DRAFT</strong><p>{companies.find(c=>c.id===d.organisation_id)?.name??"Earlier internal draft"}</p>{d.course_id&&d.organisation_id?<p><Link className="secondary-button" href={`/course-reviews/new?plan=${d.id}`}>Continue to course review</Link></p>:null}<dl className="draft-fields">{[["Course designer",d.configuration.designer_name??"Not recorded in this earlier draft"],["Designer company",d.configuration.designer_company??"Not recorded in this earlier draft"],["Currency",d.configuration.currency],["Minimum course price",d.configuration.minimum_course_price],["APGI share (%)",d.configuration.apgi_share],["Partner share (%)",d.configuration.platform_user_share],["Other-cost contingency (%)",d.configuration.contingency_rate],["Contingency allowance",d.configuration.estimated_contingency],["Recovery (%)",d.configuration.recovery_rate],["Recovery base",d.configuration.recovery_base]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><SavedServiceCosts snapshot={d.configuration.service_cost_snapshot}/><SummaryText commercial headingLevel={3} text={d.configuration.terms_summary}/></article>)}</section>
  </main>;
}
