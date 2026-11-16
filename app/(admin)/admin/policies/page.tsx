import { rows } from "@/server/services/company-structure";
import { policyReviewerStatus, type PolicyDecision } from "@/lib/policy-review";
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
import { PrivacyPolicyCard } from "@/components/policies/PrivacyPolicyCard";
export default async function AdminPoliciesPage() {
  await requireAdmin();
  const session = await requireSession();
  const principal = await isPlatformPrincipal(session);
  const [companies, policies] = await Promise.all([
    accessibleCompanies(),
    listPolicies(),
  ]);
  const [decisions, assignments] = policies.length ? await Promise.all([
    rows<PolicyDecision & {policy_id:string}>(`/rest/v1/policy_decisions?policy_id=in.(${policies.map(p=>p.id).join(",")})&select=policy_id,email,decision,reason,decided_at,content_hash`),
    rows<{policy_id:string}>(`/rest/v1/policy_reviewers?policy_id=in.(${policies.map(p=>p.id).join(",")})&email=eq.${encodeURIComponent(session.user.email?.toLowerCase() ?? "")}&select=policy_id`)
  ]) : [[], []];
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
      <PrivacyPolicyCard />
      <section className="directory-card">
        <h2>Document register and review decisions</h2><p>Open a document to read saved rejections, proposed changes and its audit trail. Creating a draft is a separate action below.</p>
        {policies.map((p) => (
          <article className="draft-summary" key={p.id}>
            <strong>
              {p.title} · {p.version_label}
            </strong>
            <span>
              {p.status} ·{" "}
              {policyScopeLabel(p, companies)}
            </span>
            <p>Your decision: <strong>{policyReviewerStatus(p,decisions.find(d=>d.policy_id===p.id && d.email===session.user.email?.toLowerCase() && d.content_hash===p.content_hash), assignments.some(a=>a.policy_id===p.id))}</strong></p>
            <p>{decisions.filter(d=>d.policy_id===p.id && d.content_hash===p.content_hash).length} reviewer decisions recorded. {p.previous_version_id ? <Link href={`/policies/${p.previous_version_id}#required-reviews`}>Read the previous version and its feedback</Link> : null}</p>
            <Link className="secondary-button" href={`/policies/${p.id}#required-reviews`}>
              Open document and decisions
            </Link>
          </article>
        ))}
        {!policies.length ? <p>No policies filed yet.</p> : null}
      </section>
      {principal ? <details className="admin-form-card"><summary>Create a new policy draft</summary><p>This creates a separate document. To respond to an existing policy, open its saved decisions above.</p><PolicyDraftForm companies={companies.map(c => ({id:c.id,name:c.name}))} principalEmail={session.user.email ?? ""}/></details> : null}
    </main>
  );
}
