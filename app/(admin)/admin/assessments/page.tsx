import { ScannexAssessmentWorkspace } from "@/components/admin/ScannexAssessmentWorkspace";
import { getCourses } from "@/lib/courses";
import { getAdminLearners } from "@/lib/services/admin/get-admin-learners";
import { getAssessmentBookings } from "@/server/services/assessments/get-assessment-bookings";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const [learnersPage, bookings] = await Promise.all([getAdminLearners({ page: 1 }), getAssessmentBookings()]);
  const learners = learnersPage.learners.map((learner) => ({ id: learner.id, name: learner.name, email: learner.email, status: learner.status }));
  const courses = getCourses().map((course) => ({ id: course.id, title: course.title }));

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Scannex summative assessment</p>
          <h1>Assessment operations</h1>
          <p>Generate a learner reference, approve the supervised station exercise, record the 68-mark theory and detailed practical rubric, then retain the controlled evidence for assessor review.</p>
        </div>
      </header>

      <ScannexAssessmentWorkspace learners={learners} courses={courses} bookings={bookings} />

      <section className="directory-card">
        <div className="admin-card-heading">
          <div>
            <p className="eyebrow">Assessment register</p>
            <h2>Recent summative assessments</h2>
          </div>
        </div>
        {bookings.length ? (
          <div className="directory-table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Learner</th>
                  <th>Status</th>
                  <th>Marks</th>
                  <th>Station / time</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><strong>{booking.reference}</strong><span>{booking.courseTitle}</span></td>
                    <td><strong>{booking.learnerName}</strong><span>{booking.learnerEmail}</span></td>
                    <td><span className={`status-badge status-${booking.status}`}>{booking.status.replaceAll("_", " ")}</span></td>
                    <td>
                      <strong>{booking.finalScore === null ? "Awaiting score" : `${booking.finalScore}/100`}</strong>
                      <span>Theory: {booking.theoryScore === null ? "—" : `${booking.theoryScore}/${booking.theoryMaxScore ?? 68}`}</span>
                      <span>Practical: {booking.practicalConvertedScore === null ? "—" : `${booking.practicalConvertedScore}/32`}</span>
                      {booking.practicalRubric ? <span>Rubric: {booking.practicalRubric.rawScore}/99 → {booking.practicalRubric.normalizedScore}/100</span> : null}
                    </td>
                    <td><strong>{booking.stationLabel ?? "Station to be confirmed"}</strong><span>{booking.scheduledFor ? new Date(booking.scheduledFor).toLocaleString() : "Not scheduled"}</span>{booking.practicalRubric ? <span>Exercise: {booking.practicalRubric.trainerExerciseReference}</span> : null}{booking.practicalRubric?.materialSafetyConcern ? <span className="assessment-safety-flag">Safety review required</span> : null}</td>
                    <td>{booking.evidence.length ? booking.evidence.map((item) => <span key={`${item.type}:${item.reference}`}>{item.type.replaceAll("_", " ")}: {item.reference}</span>) : <span>Evidence not yet recorded</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="directory-empty">No assessment bookings have been created yet.</p>}
      </section>
    </main>
  );
}
