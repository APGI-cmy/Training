import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { requirePolicy, rows } from "@/server/services/company-structure";
import { ReviewerFields } from "@/components/admin/ReviewerFields";
import { policySignatories } from "@/lib/company-structure";
import { StructureForm } from "@/components/admin/StructureForm";
import { policyStructureAction } from "@/server/actions/platform-policies";
import { isPlatformPrincipal } from "@/server/services/platform-principals";
import { PolicyDecisionForm } from "@/components/admin/PolicyDecisionForm";
import { policyReviewerStatus } from "@/lib/policy-review";
export default async function PolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  let access;
  try {
    access = await requirePolicy(id);
  } catch {
    notFound();
  }
  const { policy: p, session } = access;
  const canManage = await isPlatformPrincipal(session);
  const reviewers = await rows<{ email: string }>(
    `/rest/v1/policy_reviewers?policy_id=eq.${id}&select=email`,
  );
  const decisions = await rows<{
    email: string;
    decision: string;
    reason: string;
    decided_at: string;
    content_hash: string;
  }>(
    `/rest/v1/policy_decisions?policy_id=eq.${id}&select=email,decision,reason,decided_at,content_hash&order=decided_at.asc`,
  );
  const deliveries = canManage
    ? await rows<{ recipient_email: string; status: string }>(
        `/rest/v1/policy_email_deliveries?policy_id=eq.${id}&select=recipient_email,status`,
      )
    : [];
  const canReview =
    p.status === "submitted" &&
    reviewers.some((r) => r.email === session.user.email?.toLowerCase()) &&
    !decisions.some((d) => d.email === session.user.email?.toLowerCase() && d.content_hash === p.content_hash);
  return (
    <main className="admin-page">
      <p className="eyebrow">Controlled policy version</p>
      <h1>{p.title}</h1>
      <p>
        {p.version_label} · <strong>{p.status}</strong>
      </p>
      <section className="admin-form-card">
        <h2>Document</h2>
        <p className="policy-body">{p.body}</p>
        {p.file_path ? (
          <a className="primary-button" href={`/api/policies/${id}`}>
            Download private PDF
          </a>
        ) : null}
        <p className="field-hint policy-hash">
          Version fingerprint: {p.content_hash}
        </p>
        <p>
          Approval records agreement to this document version. It does not
          activate commissions, recover costs or authorise a payout.
        </p>
      </section>
      <section className="admin-form-card">
        <h2>Required reviews</h2>
        {p.status === "rejected" ? <p className="form-error" role="status">This version was rejected. The saved reasons and proposed changes are shown below. Create a revised version for fresh review; this version is not approved.</p> : null}
        {reviewers.map((r) => {
          const decision = decisions.find((d) => d.email === r.email && d.content_hash === p.content_hash);
          return (
            <article className="draft-summary" key={r.email}>
              <strong>{r.email}</strong>
              <span>
                {policyReviewerStatus(p, decision)}{decision ? ` · ${new Date(decision.decided_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} SAST` : ""}
              </span>
              {decision?.reason ? <div><strong>Saved comments and proposed changes</strong><p className="policy-body">{decision.reason}</p></div> : null}
            </article>
          );
        })}
        {canReview ? (
          <PolicyDecisionForm policyId={id} contentHash={p.content_hash} />
        ) : null}
      </section>
      {canManage && p.status === "draft" ? (
        <section className="admin-form-card">
          <h2>Submit for review</h2>
          <p>
            This sends real review notifications to the required email
            addresses. Opening a link never records an approval.
          </p>
          <StructureForm
            action={policyStructureAction}
            label="Submit and notify reviewers"
          >
            <input type="hidden" name="operation" value="submit" />
            <input type="hidden" name="policy_id" value={id} />
          </StructureForm>
        </section>
      ) : null}
      {canManage && deliveries.length ? (
        <section className="admin-form-card">
          <h2>Review email delivery</h2>
          {deliveries.map((d) => (
            <p key={d.recipient_email}>
              {d.recipient_email}: {d.status}
            </p>
          ))}
          <StructureForm
            action={policyStructureAction}
            label="Retry failed notifications"
          >
            <input type="hidden" name="operation" value="notify" />
            <input type="hidden" name="policy_id" value={id} />
          </StructureForm>
        </section>
      ) : null}
      {canManage && p.status !== "draft" ? (
        <section className="admin-form-card">
          <h2>Create a revised version</h2>
          <p>
            Existing decisions and documents are retained. Every reviewer must
            decide again on the new version.
          </p>
          <StructureForm
            action={policyStructureAction}
            label="Save new draft version"
          >
            <input type="hidden" name="operation" value="revise" />
            <input type="hidden" name="policy_id" value={id} />
            <label>
              New version label
              <input name="version_label" required maxLength={60} />
            </label>
            <ReviewerFields locked={p.visibility === "internal"} initialEmails={p.visibility === "internal" ? [...policySignatories] : reviewers.map(r => r.email)} />
            <label className="admin-span-two">
              Revised summary and terms
              <textarea
                name="body"
                rows={6}
                defaultValue={p.body}
                required
                minLength={10}
              />
            </label>
            <label>
              Replacement PDF (optional)
              <input name="pdf" type="file" accept="application/pdf" />
            </label>
          </StructureForm>
        </section>
      ) : null}
    </main>
  );
}
