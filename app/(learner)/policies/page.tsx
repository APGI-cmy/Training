import { rows } from "@/server/services/company-structure";
import { policyReviewerStatus, type PolicyDecision } from "@/lib/policy-review";
import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listPolicies } from "@/server/services/company-structure";
import { PrivacyPolicyCard } from "@/components/policies/PrivacyPolicyCard";
export default async function MyPolicies() {
  const session = await requireSession();
  const policies = await listPolicies();
  const [decisions, assignments] = policies.length ? await Promise.all([
    rows<PolicyDecision & {policy_id:string}>(`/rest/v1/policy_decisions?policy_id=in.(${policies.map(p=>p.id).join(",")})&select=policy_id,email,decision,reason,decided_at,content_hash`),
    rows<{policy_id:string}>(`/rest/v1/policy_reviewers?policy_id=in.(${policies.map(p=>p.id).join(",")})&email=eq.${encodeURIComponent(session.user.email?.toLowerCase() ?? "")}&select=policy_id`)
  ]) : [[], []];
  return (
    <main className="admin-page">
      <h1>Your policies and review requests</h1>
      <PrivacyPolicyCard />
      <section className="admin-form-card"><h2>Course pricing policy</h2><p>Platform-wide course access, credit allowances, prices and revenue-allocation rules. Its approval and effective status are shown on the document.</p><Link href="/pricing-policy">Read course access and commercial pricing policy</Link></section>
      <p>
        Only your company documents and versions explicitly assigned to you
        appear here.
      </p>
      {policies.map((p) => (
        <article key={p.id} className="admin-form-card">
          <h2>{p.title}</h2>
          <p>
            {p.version_label} · {p.status}
          </p>
          <p>Your decision: <strong>{policyReviewerStatus(p, decisions.find(d=>d.policy_id===p.id && d.email===session.user.email?.toLowerCase() && d.content_hash===p.content_hash), assignments.some(a=>a.policy_id===p.id))}</strong></p>
          {p.previous_version_id ? <p>This is a revised version. <Link href={`/policies/${p.previous_version_id}#required-reviews`}>Read the earlier decisions and proposed changes</Link>.</p> : null}
          <Link href={`/policies/${p.id}#required-reviews`}>Open document, decisions and audit trail</Link>
        </article>
      ))}
      {!policies.length ? <p>No policies are assigned to you yet.</p> : null}
    </main>
  );
}
