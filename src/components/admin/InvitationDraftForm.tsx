"use client";

import { useState, type FormEvent } from "react";

type Draft = { recipientEmail: string; courseId: string; basis: string; reason: string; reference: string; company: string; nationalIdentityNumber: string; expiresAt: string };

export function InvitationDraftForm({ courses, defaultExpiry }: { courses: Array<{ id: string; title: string }>; defaultExpiry: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  function reviewDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const expiresAt = String(fields.get("expiresAt") ?? "");
    const expiry = new Date(expiresAt);
    if (!expiresAt || Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      setDraft(null);
      setError("Choose an expiry date and time in the future before reviewing this invitation draft.");
      return;
    }
    setError(null);
    setDraft({ recipientEmail: String(fields.get("recipientEmail") ?? "").trim(), courseId: String(fields.get("courseId") ?? ""), basis: String(fields.get("basis") ?? ""), reason: String(fields.get("reason") ?? "").trim(), reference: String(fields.get("reference") ?? "").trim(), company: String(fields.get("company") ?? "").trim(), nationalIdentityNumber: String(fields.get("nationalIdentityNumber") ?? "").trim(), expiresAt });
  }
  const selectedCourse = courses.find((course) => course.id === draft?.courseId)?.title;
  return <div className="admin-workspace-grid"><form className="admin-form-card" onSubmit={reviewDraft}><div className="admin-card-heading"><div><p className="eyebrow">Step 1 of 2</p><h2>Invitation details</h2></div><span className="status-badge status-draft">Draft only</span></div><p className="form-guidance">Review a complete invitation before we agree the test learner and delivery lifecycle. Nothing is created or sent from this screen.</p><div className="admin-form-grid"><label>Learner email<input name="recipientEmail" type="email" placeholder="learner@example.com" required /></label><label>Course<select name="courseId" required defaultValue=""><option value="" disabled>Select a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Access basis<select name="basis" required defaultValue="corporate_order"><option value="external_payment">External payment</option><option value="corporate_order">Corporate order</option><option value="complimentary_marketing">Complimentary marketing</option><option value="internal_allocation">Internal allocation</option><option value="other">Other</option></select></label><label>Expires at<input name="expiresAt" type="datetime-local" defaultValue={defaultExpiry} required /></label><label className="admin-span-two">Reason<textarea name="reason" placeholder="Why is this learner receiving course access?" required /></label><label>Reference<input name="reference" placeholder="Order, PO or internal reference" /></label><label>Company<input name="company" placeholder="Organisation name" /></label><label>National identity number<input name="nationalIdentityNumber" type="password" autoComplete="off" placeholder="Optional — kept only in this browser draft" /></label></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" type="submit">Review invitation draft</button></form><aside className="admin-side-card" aria-live="polite"><p className="eyebrow">Step 2 of 2</p><h2>Approval boundary</h2>{draft ? <div className="draft-summary"><p><strong>{draft.recipientEmail}</strong></p><p>{selectedCourse}</p><p>{draft.basis.replaceAll("_", " ")}</p><p>Expiry: {new Date(draft.expiresAt).toLocaleString()}</p>{draft.company ? <p>Company: {draft.company}</p> : null}</div> : <p>Complete the form to see the invitation that would be reviewed. No raw token is generated at draft stage.</p>}<div className="safety-note"><strong>created_not_sent</strong><span>Invitation creation, enrolment creation and email delivery are disabled until the test learner and lifecycle are agreed.</span></div></aside></div>;
}
