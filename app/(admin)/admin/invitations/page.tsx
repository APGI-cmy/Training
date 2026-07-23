import { getCourses } from "@/lib/courses";
import { createInvitation } from "@/server/actions/invitations/create-invitation";

async function submitInvitation(formData: FormData) {
  "use server";
  await createInvitation(formData);
}

export default function InvitationsPage() {
  const courses = getCourses();
  const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <main>
      <h2>Create learner invitation</h2>
      <p>Every invitation is course-scoped, time-limited and auditable. A reason is mandatory.</p>
      <form action={submitInvitation} className="form-stack">
        <label>
          Learner email
          <input name="recipientEmail" type="email" required />
        </label>
        <label>
          Course
          <select name="courseId" required>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label>
          Access basis
          <select name="basis" required>
            <option value="external_payment">External payment</option>
            <option value="corporate_order">Corporate order</option>
            <option value="complimentary_marketing">Complimentary marketing</option>
            <option value="internal_allocation">Internal allocation</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Reason
          <textarea name="reason" required />
        </label>
        <label>
          Reference
          <input name="reference" />
        </label>
        <label>
          Company
          <input name="company" />
        </label>
        <label>
          Expires at
          <input name="expiresAt" type="datetime-local" defaultValue={defaultExpiry} required />
        </label>
        <button type="submit">Create invitation</button>
      </form>
    </main>
  );
}
