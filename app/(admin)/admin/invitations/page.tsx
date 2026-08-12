import { InvitationDraftForm } from "@/components/admin/InvitationDraftForm";
import { LearnerImportWorkspace } from "@/components/admin/LearnerImportWorkspace";
import { getCourses } from "@/lib/courses";

export default function InvitationsPage() {
  const courses = getCourses().map(({ id, title }) => ({ id, title }));
  const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Invite and import learners</h1>
          <p>Prepare learner access clearly and safely. This release adds validation and review; it does not create invitations, learner accounts or email.</p>
        </div>
      </header>
      <InvitationDraftForm courses={courses} defaultExpiry={defaultExpiry} />
      <div id="import"><LearnerImportWorkspace /></div>
    </main>
  );
}
