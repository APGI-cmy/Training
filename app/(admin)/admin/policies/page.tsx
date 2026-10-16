import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  accessibleCompanies,
  listPolicies,
} from "@/server/services/company-structure";
import { StructureForm } from "@/components/admin/StructureForm";
import { policyStructureAction } from "@/server/actions/platform-policies";
import { isPlatformPrincipal } from "@/server/services/platform-principals";
export default async function AdminPoliciesPage() {
  await requireAdmin();
  const principal = await isPlatformPrincipal();
  const [companies, policies] = await Promise.all([
    accessibleCompanies(),
    listPolicies(),
  ]);
  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Governance</p>
          <h1>Platform policies</h1>
          <p>
            Keep exact document versions, request review and retain approval
            history. Financial distributions are not activated by policy
            approval in this structural release.
          </p>
        </div>
      </header>
      {principal ? <section className="admin-form-card">
        <h2>Create a policy draft</h2>
        <StructureForm action={policyStructureAction} label="Save policy draft">
          <input type="hidden" name="operation" value="create" />
          <label>
            Policy title
            <input name="title" required minLength={3} maxLength={180} />
          </label>
          <label>
            Version label
            <input
              name="version_label"
              required
              placeholder="Draft 0.1"
              maxLength={60}
            />
          </label>
          <label>
            Company scope
            <select name="organisation_id">
              <option value="">Confidential internal - two principals only</option>
              {companies.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Required reviewer emails
            <textarea
              name="reviewers"
              placeholder="For a company agreement: your APGI representative email and the company signatory email(s). Internal documents always use exactly the two principals."
            />
          </label>
          <label className="admin-span-two">
            Summary and terms
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={40000}
              rows={6}
            />
          </label>
          <label>
            PDF document (optional)
            <input type="file" name="pdf" accept="application/pdf" />
            <small>
              Private PDF, up to 3 MB. Submitted versions cannot be overwritten.
            </small>
          </label>
        </StructureForm>
      </section> : <p>Company agreements available to your role appear below. Internal governance is restricted.</p>}
      <section className="directory-card">
        <h2>Document register</h2>
        {policies.map((p) => (
          <article className="draft-summary" key={p.id}>
            <strong>
              {p.title} · {p.version_label}
            </strong>
            <span>
              {p.status} ·{" "}
              {companies.find((c) => c.id === p.organisation_id)?.name ??
                "Confidential internal"}
            </span>
            <Link className="secondary-button" href={`/policies/${p.id}`}>
              Open document and decisions
            </Link>
          </article>
        ))}
        {!policies.length ? <p>No policies filed yet.</p> : null}
      </section>
    </main>
  );
}
