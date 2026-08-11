import { getCourses } from "@/lib/courses";
import { changeEnrolmentStatus } from "@/server/actions/enrolments/change-enrolment-status";

async function submitStatusChange(formData: FormData) {
  "use server";
  await changeEnrolmentStatus({
    userId: String(formData.get("userId") ?? "").trim(),
    courseId: String(formData.get("courseId") ?? "").trim(),
    nextStatus: String(formData.get("nextStatus") ?? "revoked") as "enrolled" | "revoked",
    reason: String(formData.get("reason") ?? "").trim()
  });
}

export default function EnrolmentAdministrationPage() {
  const courses = getCourses();

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Administration</p>
        <h1>Revoke or reinstate course access</h1>
        <p>Use the learner&apos;s authenticated user ID. Every change requires a reason and creates an audit event.</p>
      </header>
      <form action={submitStatusChange} className="form-stack">
        <label>
          Learner user ID
          <input name="userId" required />
        </label>
        <label>
          Course
          <select name="courseId" required>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label>
          Access action
          <select name="nextStatus" required>
            <option value="revoked">Revoke access</option>
            <option value="enrolled">Reinstate access</option>
          </select>
        </label>
        <label>
          Reason
          <textarea name="reason" required />
        </label>
        <button type="submit">Record access change</button>
      </form>
    </main>
  );
}
