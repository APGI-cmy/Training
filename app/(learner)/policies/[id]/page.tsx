import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { requirePolicy, rows } from "@/server/services/company-structure";
import { StructureForm } from "@/components/admin/StructureForm";
import { policyStructureAction } from "@/server/actions/platform-policies";
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
  const { policy: p, isAdmin, session } = access;
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
  const deliveries = isAdmin
    ? await rows<{ recipient_email: string; status: string }>(
        `/rest/v1/policy_email_deliveries?policy_id=eq.${id}&select=recipient_email,status`,
      )
    : [];
  const canReview =
    p.status === "submitted" &&
    reviewers.some((r) => r.email === session.user.email?.toLowerCase()) &&
    !decisions.some((d) => d.email === session.user.email?.toLowerCase());
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
        {reviewers.map((r) => {
          const decision = decisions.find((d) => d.email === r.email);
          return (
            <article className="draft-summary" key={r.email}>
              <strong>{r.email}</strong>
              <span>
                {decision
                  ? `${decision.decision} · ${new Date(decision.decided_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}`
                  : "Awaiting decision"}
              </span>
              {decision?.reason ? <p>{decision.reason}</p> : null}
            </article>
          );
        })}
        {canReview ? (
          <StructureForm
            action={policyStructureAction}
            label="Record my decision"
          >
            <input type="hidden" name="policy_id" value={id} />
            <label className="admin-span-two">
              <input type="checkbox" name="confirm_decision" required /> I
              reviewed this exact version and confirm my selected decision.
            </label>
            <label>
              My decision
              <select name="operation">
                <option value="approve">Approve this version</option>
                <option value="reject">
                  Reject and request reconfiguration
                </option>
              </select>
            </label>
            <label>
              Reason (required for rejection)
              <textarea name="reason" maxLength={3000} />
            </label>
          </StructureForm>
        ) : null}
      </section>
      {isAdmin && p.status === "draft" ? (
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
      {isAdmin && deliveries.length ? (
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
      {isAdmin && p.status !== "draft" ? (
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
            <label>
              Required reviewers
              <textarea
                name="reviewers"
                defaultValue={reviewers.map((r) => r.email).join("\n")}
                required
              />
            </label>
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
