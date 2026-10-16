import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { requireAdmin } from "@/lib/auth/require-admin";
import { notFound } from "next/navigation";
import { accessibleCompanies, rows } from "@/server/services/company-structure";
import { StructureForm } from "@/components/admin/StructureForm";
import { saveCommercialDraft } from "@/server/actions/platform-policies";
import {
  financialDraftFields,
  type DraftRecord,
} from "@/lib/company-structure";
import { getCourses } from "@/lib/courses";
export default async function AgreementsPage() {
  await requireAdmin();
  try { await requirePlatformPrincipal(); } catch { notFound(); }
  const [companies, drafts] = await Promise.all([
    accessibleCompanies(),
    rows<DraftRecord>(
      "/rest/v1/commercial_agreement_drafts?select=*&order=created_at.desc&limit=100",
    ),
  ]);
  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Non-operative preparation</p>
          <h1>Commercial drafts</h1>
          <p>
            Prepare course rights, development costs, operating allocations and
            internal distributions. The policy is awaiting agreement: no rates
            are active and this workspace cannot charge or pay anyone.
          </p>
        </div>
      </header>
      <section className="notice-card">
        <strong>Financial activation is unavailable</strong>
        <p>
          Running costs and their cost-only administration fee must come first.
          Course shares, recovery bases and company distributions require an approved schedule.
          No values are automatically applied. Leave fields blank until agreed.
          Policy approval alone does not activate a financial draft.
        </p>
      </section>
      <section className="admin-form-card">
        <h2>Prepare an agreement or cost record</h2>
        <StructureForm
          action={saveCommercialDraft}
          label="Save non-operative draft"
        >
          <label>
            Title
            <input name="title" minLength={3} maxLength={150} required />
          </label>
          <label>
            Draft type
            <select name="kind">
              <option value="course_agreement">
                Course agreement and development recovery
              </option>
              <option value="operating_cost">Operating cost allocation</option>
              <option value="internal_distribution">
                APGI internal distribution
              </option>
            </select>
          </label>
          <label>
            Company
            <select name="organisation_id">
              <option value="">APGI internal</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Course
            <select name="course_id">
              <option value="">Not course-specific</option>
              {getCourses().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          {financialDraftFields.map((key) => (
            <label
              key={key}
              className={key === "notes" ? "admin-span-two" : undefined}
            >
              {key.replaceAll("_", " ")}
              {key === "notes" ? (
                <textarea name={key} rows={4} />
              ) : (
                <input name={key} maxLength={250} placeholder="Not agreed" />
              )}
            </label>
          ))}
        </StructureForm>
      </section>
      <section className="directory-card">
        <h2>Saved drafts</h2>
        <p>
          Each save creates a new working record; it does not overwrite a prior
          statement or create a payable allocation.
        </p>
        {drafts.map((d) => (
          <article key={d.id} className="draft-summary">
            <strong>{d.title} · DRAFT ONLY</strong>
            <p>
              {d.kind.replaceAll("_", " ")} ·{" "}
              {companies.find((c) => c.id === d.organisation_id)?.name ??
                "APGI internal"}
            </p>
            <dl className="draft-fields">
              {Object.entries(d.configuration)
                .filter(([, v]) => v !== null)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k.replaceAll("_", " ")}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
