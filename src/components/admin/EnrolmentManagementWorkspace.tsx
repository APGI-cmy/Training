"use client";

import { useState, type FormEvent } from "react";

type Learner = { id: string; name: string; email: string } | null;
type ReviewDraft = { action: "revoke" | "reinstate"; courseTitle: string; reason: string };

export function EnrolmentManagementWorkspace({ learner, courses }: { learner: Learner; courses: Array<{ id: string; title: string }> }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"revoke" | "reinstate">("revoke");
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const selectedCourseTitle = courses.find((course) => course.id === courseId)?.title ?? "Course selection required";

  function reviewAccessChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!learner || !reason.trim()) return;
    setDraft({ action, courseTitle: selectedCourseTitle, reason: reason.trim() });
  }

  return (
    <section className="enrolment-workspace">
      <div className="enrolment-context">
        <p className="eyebrow">Selected learner</p>
        <h2>{learner?.name ?? "Choose a learner"}</h2>
        <p>{learner?.email ?? "Start from the Learners directory to keep access decisions attached to a known learner record."}</p>
        {learner ? <code>Directory context loaded</code> : null}
      </div>
      <div className="admin-workspace-grid">
        <form className="admin-form-card" onSubmit={reviewAccessChange}>
          <div className="admin-card-heading"><div><p className="eyebrow">Access decision</p><h2>Prepare enrolment change</h2></div><span className="status-badge status-draft">Draft only</span></div>
          <p className="form-guidance">The selected course and reason are intentionally review-only. The server action is not connected in this slice.</p>
          <div className="admin-form-grid">
            <label>Course<select value={courseId} onChange={(event) => setCourseId(event.target.value)}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <label>Action<select value={action} onChange={(event) => setAction(event.target.value as "revoke" | "reinstate")}><option value="revoke">Revoke access</option><option value="reinstate">Reinstate access</option></select></label>
            <label className="admin-span-two">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} required placeholder="Record the reason that would be audited with this decision." /></label>
          </div>
          <button className="primary-button" type="submit" disabled={!learner || !reason.trim()}>Review access change</button>
        </form>
        <aside className="admin-side-card" aria-live="polite">
          <p className="eyebrow">Safety boundary</p>
          <h2>{draft ? "Review draft prepared" : "No change recorded"}</h2>
          {draft ? <div className="draft-summary"><p><strong>{draft.action === "revoke" ? "Access would be revoked" : "Access would be reinstated"}</strong></p><p>{draft.courseTitle}</p><p>Reason: {draft.reason}</p></div> : <p>This workspace prepares a traceable review. Revoke/reinstate execution remains disabled until lifecycle testing is agreed.</p>}
          <div className="safety-note"><strong>Not applied</strong><span>This review does not create, change, revoke or reinstate enrolment access.</span></div>
        </aside>
      </div>
    </section>
  );
}
