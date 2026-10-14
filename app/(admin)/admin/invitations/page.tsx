import { InvitationForm } from "@/components/admin/InvitationForm";
import { LearnerImportWorkspace } from "@/components/admin/LearnerImportWorkspace";
import { getCourses } from "@/lib/courses";
import { getActiveOrganisations } from "@/server/services/organisations/get-organisations";
import { getGroups } from "@/server/services/groups";
import { createGroup } from "@/server/actions/groups";
import { adminRest } from "@/server/supabase/admin-rest";

export default async function InvitationsPage() {
  const courses = getCourses().map(({ id, title }) => ({ id, title }));
  const organisations = (await getActiveOrganisations()).map(({ id, name, slug }) => ({ id, name, slug }));
  const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const groups = await getGroups();
  const response = await adminRest("/rest/v1/course_invitations?select=id,recipient_email,course_id,invited_role,group_id,status,expires_at&order=created_at.desc&limit=100");
  if (!response.ok) throw new Error("Invitation list is unavailable.");
  const invitations = await response.json() as Array<{id:string;recipient_email:string;course_id:string;invited_role:string;group_id:string|null;status:string;expires_at:string}>;

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Invitations and groups</h1>
          <p>Send individual course invitations or securely stage a bulk invitation run. The invited course becomes available when the learner signs in with the matching verified email address and saves their profile.</p>
        </div>
      </header>
      <InvitationForm courses={courses} organisations={organisations} defaultExpiry={defaultExpiry} groups={groups} />
      <section className="admin-form-card"><h2>Add a learner group</h2><form action={createGroup} className="admin-form-grid"><label>Organisation<select name="organisationId" required>{organisations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label>Group name<input name="name" required maxLength={100} /></label><button className="secondary-button">Save group</button></form><p>Individual learner (no group) is always available. Create groups here before assigning them or using group_name in an import.</p>{groups.map(g => <p key={g.id}>{g.name} · {organisations.find(o=>o.id===g.organisation_id)?.name}</p>)}</section>
      <div id="import"><LearnerImportWorkspace courses={courses} organisations={organisations} groups={groups} /></div>
      <section className="directory-card"><h2>Recent invitations</h2><div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>Email</th><th>Role</th><th>Course</th><th>Group</th><th>Status</th></tr></thead><tbody>{invitations.map(i => <tr key={i.id}><td>{i.recipient_email}</td><td>{i.invited_role}</td><td>{courses.find(c=>c.id===i.course_id)?.title ?? "Platform administration"}</td><td>{i.invited_role==='admin' ? 'Not applicable' : groups.find(g=>g.id===i.group_id)?.name ?? 'Individual learner'}</td><td>{i.status==='pending' && new Date(i.expires_at)<new Date() ? 'expired' : i.status}</td></tr>)}</tbody></table></div><p>Latest 100 invitations. Test links are shown once after creation and are not stored as readable tokens.</p></section>
    </main>
  );
}
