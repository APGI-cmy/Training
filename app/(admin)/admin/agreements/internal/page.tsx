import {InternalDistributionForm} from '@/components/admin/InternalDistributionForm';
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { rows } from "@/server/services/company-structure";
import { type DraftRecord } from "@/lib/company-structure";
import { CostProfileForm } from "@/components/admin/CostProfileForm";
export default async function InternalAgreementPage() {
 await requireAdmin();try { await requirePlatformPrincipal(); } catch { notFound(); }
 const drafts=await rows<DraftRecord>("/rest/v1/commercial_agreement_drafts?kind=in.(operating_cost,internal_distribution)&organisation_id=is.null&select=*&order=created_at.desc&limit=100");
 const defaults=drafts.find(d=>d.kind==="internal_distribution")?.configuration;
 return <main className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">Confidential internal workspace</p><h1>APGI / SRMS agreement and costs</h1><p>Actual cost payers, internal distributions and reimbursements are private. The partner agreement uses the combined APGI identity.</p></div></header><p><Link href="/admin/agreements">Return to course and partner planning</Link> · <Link href="/admin/policies">Internal policy versions and approvals</Link></p>
 <section className="admin-form-card"><h2>Reusable course cost estimate</h2><p>Enter the per-learner assumptions once, then select the profile in course preparation. Actual provider invoices and payments remain separate from estimates.</p><CostProfileForm/></section>
 <section className="admin-form-card"><h2>APGI / SRMS equal partnership and profit distribution</h2><InternalDistributionForm defaults={defaults}/></section>
 <section className="directory-card"><h2>Internal working records</h2>{drafts.map(d=><article className="draft-summary" key={d.id}><strong>{d.title} · DRAFT</strong><dl className="draft-fields">{Object.entries(d.configuration).filter(([,v])=>v!==null).map(([key,value])=><div key={key}><dt>{(key==="johan_share"?"SRMS share":key==="jorrie_share"?"APGI share":key).replaceAll("_"," ")}</dt><dd>{value}</dd></div>)}</dl></article>)}</section><p>These drafts cannot charge fees, approve financial terms or transfer funds.</p></main>;
}
