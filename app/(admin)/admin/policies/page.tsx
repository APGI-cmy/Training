import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  accessibleCompanies,
  listPolicies,
} from "@/server/services/company-structure";
import { PolicyDraftForm } from "@/components/admin/PolicyDraftForm";
import { requireSession } from "@/server/auth/session";
import { policyScopeLabel } from "@/lib/company-structure";
import { isPlatformPrincipal } from "@/server/services/platform-principals";
export default async function AdminPoliciesPage() {
  await requireAdmin();
  const session = await requireSession();
  const principal = await isPlatformPrincipal(session);
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
        <PolicyDraftForm companies={companies.map(c => ({id:c.id,name:c.name}))} principalEmail={session.user.email ?? ""} />
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
              {policyScopeLabel(p, companies)}
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
