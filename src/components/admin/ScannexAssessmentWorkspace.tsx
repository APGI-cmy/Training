"use client";

import { useActionState } from "react";
import { SCANNEX_PRACTICAL_RAW_MAX_SCORE, SCANNEX_PRACTICAL_RUBRIC } from "@/lib/assessments/scannex-practical-rubric";
import { createAssessmentBooking, recordAssessmentEvidence, type AssessmentActionState } from "@/server/actions/assessments/manage-scannex-assessment";
import type { AssessmentBooking } from "@/server/services/assessments/get-assessment-bookings";

const initialState: AssessmentActionState = {};
const practicalSections = [...new Set(SCANNEX_PRACTICAL_RUBRIC.map((criterion) => criterion.section))];

export function ScannexAssessmentWorkspace({
  learners,
  courses,
  bookings
}: {
  learners: Array<{ id: string; name: string; email: string; status: string }>;
  courses: Array<{ id: string; title: string }>;
  bookings: AssessmentBooking[];
}) {
  const [bookingState, bookingAction, bookingPending] = useActionState(createAssessmentBooking, initialState);
  const [evidenceState, evidenceAction, evidencePending] = useActionState(recordAssessmentEvidence, initialState);
  return <div className="admin-workspace-grid">
    <section className="admin-form-card">
      <div className="admin-card-heading"><div><p className="eyebrow">Assessment booking</p><h2>Create learner reference</h2></div></div>
      <p className="form-guidance">Only enrolled learners can be scheduled. The generated reference must be used in the Scannex Trainer result, Viewer Movement Log and assessor checklist file names. The latest recorded theory score is linked automatically.</p>
      <form className="form-stack" action={bookingAction}>
        <label>Learner<select name="learnerId" required defaultValue=""><option value="" disabled>Select an enrolled learner</option>{learners.filter((learner) => learner.status === "enrolled").map((learner) => <option value={learner.id} key={learner.id}>{learner.name} — {learner.email}</option>)}</select></label>
        <label>Course<select name="courseId" required defaultValue="scannex-training-programme">{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
        <label>Scheduled assessment time<input name="scheduledFor" type="datetime-local" /></label>
        <label>Approved station<input name="stationLabel" placeholder="e.g. Cape Town Scannex Station 01" /></label>
        <label>Assessor notes<textarea name="notes" placeholder="Booking or accommodation notes" /></label>
        <label><input name="approved" type="checkbox" /> I approve this learner to undertake the practical assessment.</label>
        {bookingState.error ? <p className="form-error" role="alert">{bookingState.error}</p> : null}
        {bookingState.message ? <p className="feedback feedback-correct" role="status">{bookingState.message}</p> : null}
        <button className="primary-button" type="submit" disabled={bookingPending}>{bookingPending ? "Creating…" : "Create assessment booking"}</button>
      </form>
    </section>
    <section className="admin-form-card">
      <div className="admin-card-heading"><div><p className="eyebrow">Practical rubric, evidence and decision</p><h2>Record Scannex outcome</h2></div></div>
      <p className="form-guidance">Record the controlled Trainer exercise and the approved evidence references. The source instrument has {SCANNEX_PRACTICAL_RAW_MAX_SCORE} raw marks, which the platform normalises to 100 before converting it to the 32 practical marks. Do not enter Scannex passwords or personal identity numbers.</p>
      <form className="form-stack" action={evidenceAction}>
        <label>Assessment reference<select name="assessmentId" required defaultValue=""><option value="" disabled>Select an assessment</option>{bookings.filter((booking) => !["passed", "failed", "cancelled"].includes(booking.status)).map((booking) => <option key={booking.id} value={booking.id}>{booking.reference} — {booking.learnerName}</option>)}</select></label>
        <label>Trainer exercise / case-set reference<input name="trainerExerciseReference" placeholder="e.g. SCN-TRAINER-PILOT-A-01" /></label>
        <fieldset className="practical-rubric-fieldset">
          <legend>Practical marking rubric</legend>
          <p>Enter every item when recording the practical score. Leave the whole rubric blank if you are only adding evidence at this stage.</p>
          {practicalSections.map((section) => (
            <section className="practical-rubric-section" key={section}>
              <h3>{section}</h3>
              {SCANNEX_PRACTICAL_RUBRIC.filter((criterion) => criterion.section === section).map((criterion) => (
                <label className="practical-rubric-row" key={criterion.id}>
                  <span>{criterion.label}<small>Maximum {criterion.maximumScore}</small></span>
                  <input aria-label={`${criterion.label} score out of ${criterion.maximumScore}`} name={`practicalScore_${criterion.id}`} type="number" min="0" max={criterion.maximumScore} step="1" inputMode="numeric" />
                </label>
              ))}
            </section>
          ))}
        </fieldset>
        <label className="checkbox-label"><input name="materialSafetyConcern" type="checkbox" /> A material safety or role-boundary concern requires review before a pass decision.</label>
        <label>Safety review notes<textarea name="safetyReviewNotes" placeholder="Required when a material safety or role-boundary concern is identified" /></label>
        <label>Saved Scannex result<input name="scannexResult" placeholder="e.g. SCN-260923-1234ABCD-results.txt" /></label>
        <label>Viewer Movement Log<input name="movementLog" placeholder="e.g. SCN-260923-1234ABCD-movement.log" /></label>
        <label>Assessor checklist reference<input name="checklist" placeholder="e.g. SCN-260923-1234ABCD-checklist.pdf" /></label>
        <label>Assessor notes<textarea name="assessorNotes" placeholder="Evidence review and any remediation required" /></label>
        <label>Decision<select name="decision" defaultValue="evidence_pending"><option value="evidence_pending">Evidence recorded — awaiting decision</option><option value="passed">Passed — requires all evidence and 75/100 overall</option><option value="failed">Not yet competent</option></select></label>
        {evidenceState.error ? <p className="form-error" role="alert">{evidenceState.error}</p> : null}
        {evidenceState.message ? <p className="feedback feedback-correct" role="status">{evidenceState.message}</p> : null}
        <button className="primary-button" type="submit" disabled={evidencePending}>{evidencePending ? "Recording…" : "Record assessment evidence"}</button>
      </form>
    </section>
  </div>;
}
