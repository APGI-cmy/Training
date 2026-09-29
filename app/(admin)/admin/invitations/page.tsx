import { InvitationForm } from "@/components/admin/InvitationForm";
import { LearnerImportWorkspace } from "@/components/admin/LearnerImportWorkspace";
import { getCourses } from "@/lib/courses";
import { getActiveOrganisations } from "@/server/services/organisations/get-organisations";

export default async function InvitationsPage() {
  const courses = getCourses().map(({ id, title }) => ({ id, title }));
  const organisations = (await getActiveOrganisations()).map(({ id, name, slug }) => ({ id, name, slug }));
  const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Invite and import learners</h1>
          <p>Send individual course invitations or securely stage a bulk invitation run. A learner receives access only after accepting a valid invitation with the matching email address.</p>
        </div>
      </header>
      <InvitationForm courses={courses} organisations={organisations} defaultExpiry={defaultExpiry} />
      <div id="import"><LearnerImportWorkspace courses={courses} organisations={organisations} /></div>
    </main>
  );
}
