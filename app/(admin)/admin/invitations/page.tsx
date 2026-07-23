import { InvitationForm } from "@/components/admin/InvitationForm";
import { getCourses } from "@/lib/courses";

export default function InvitationsPage() {
  const courses = getCourses().map(({ id, title }) => ({ id, title }));
  const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <main>
      <h2>Create learner invitation</h2>
      <p>Every invitation is course-scoped, time-limited and auditable. A reason is mandatory.</p>
      <InvitationForm courses={courses} defaultExpiry={defaultExpiry} />
    </main>
  );
}
