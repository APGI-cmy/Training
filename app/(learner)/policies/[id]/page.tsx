import Link from "next/link";
import { policyHistory } from "@/server/services/policy-history";
import { PolicyReviewHistory, PolicySavedResponse } from "@/components/admin/PolicyReviewHistory";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { rows } from "@/server/services/company-structure";
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
    access = await policyHistory(id);
  } catch {
    notFound();
  }
  const { policy: p, session } = access;
  const canManage = await isPlatformPrincipal(session);
  const reviewers = await rows<{ email: string }>(
    `/rest/v1/policy_reviewers?policy_id=eq.${id}&select=email`,
  );
  const { versions, events, replacement } = access;
  const decisions = access.decisions.filter(d => d.policy_id === id && d.content_hash === p.content_hash);
  const ownDecision = decisions.find(d => d.email === session.user.email?.toLowerCase());
  const deliveries = canManage
    ? await rows<{ recipient_email: string; status: string }>(
        `/rest/v1/policy_email_deliveries?policy_id=eq.${id}&select=recipient_email,status`,
      )
    : [];
  const canReview =
    ["submitted", "rejected"].includes(p.status) && !replacement &&
    reviewers.some((r) => r.email === session.user.email?.toLowerCase()) &&
    !decisions.some((d) => d.email === session.user.email?.toLowerCase() && d.content_hash === p.content_hash);
  return (
    <main className="admin-page">
      <p><Link href="/policies">All policies and review requests</Link> · <a href="#required-reviews">Decisions and proposed changes</a> · <a href="#policy-history">Audit trail</a></p>
      <p className="eyebrow">Controlled policy version</p>
      <h1>{p.title}</h1>
      <p>
        {p.version_label} · <strong>{p.status}</strong>
      </p>
      {replacement ? <aside className="notice-card"><strong>This is an earlier version. Its saved decisions remain below.</strong><p><Link href={`/policies/${replacement.id}#required-reviews`}>Open the revised version: {replacement.version_label}</Link></p></aside> : null}
      {ownDecision ? <aside className={ownDecision.decision === "reject" ? "form-error" : "form-success"} role="status"><strong>Your decision on this version: {policyReviewerStatus(p, ownDecision)}</strong><p>Your response is saved. You do not need to approve or reject this version again. <a href="#required-reviews">Read your saved response</a>.</p></aside> : canReview ? <aside className="notice-card"><strong>Your decision on this version is still required.</strong><p>{p.previous_version_id ? "This is a revised document. Your earlier decision remains in the audit trail; please review the changes before deciding on this new version." : "Read the document and any other reviewer's saved response, then record your own independent decision."}</p></aside> : null}
      {versions.length > 1 ? <section className="admin-form-card"><h2>Feedback that led to this revision</h2>{access.decisions.filter(d=>d.policy_id!==id && d.decision==="reject").map(d=><details key={`${d.policy_id}:${d.email}`}><summary>{d.email} — earlier rejection and proposed changes</summary><PolicySavedResponse decision={d}/><Link href={`/policies/${d.policy_id}#required-reviews`}>Open rejected version</Link></details>)}</section> : null}
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
      <section className="admin-form-card" id="required-reviews">
        <h2>Required reviews and saved decisions</h2>
        {p.status === "rejected" ? <p className="form-error" role="status">This version was rejected. The saved reasons and proposed changes are shown below. This version is not approved. Other assigned reviewers may record their independent response until a revised version is submitted. A later approval cannot override a recorded rejection.</p> : null}
        {reviewers.map((r) => {
          const decision = decisions.find((d) => d.email === r.email && d.content_hash === p.content_hash);
          return (
            <article className="draft-summary" key={r.email}>
              <strong>{r.email}</strong>
              <span>
                {policyReviewerStatus(p, decision)}{decision ? ` · ${new Date(decision.decided_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} SAST` : ""}
              </span>
              {decision ? <PolicySavedResponse decision={decision}/> : null}
            </article>
          );
        })}
        {canReview ? (
          <PolicyDecisionForm policyId={id} contentHash={p.content_hash} />
        ) : null}
      </section>
      <PolicyReviewHistory versions={versions} decisions={access.decisions} events={events}/>
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
      {canManage && p.status !== "draft" && !replacement ? (
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
