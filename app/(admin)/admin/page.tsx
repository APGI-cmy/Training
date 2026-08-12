import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div><p className="eyebrow">Administration</p><h1>Learner management</h1><p>Find learners, prepare enrolment work and preview published courses from one governed workspace.</p></div>
      </header>
      <section className="admin-launch-grid">
        <Link href="/admin/learners"><strong>Learners</strong><span>Search learner records and course relationships.</span></Link>
        <Link href="/admin/invitations"><strong>Invite and import</strong><span>Prepare invitation and bulk-import drafts safely.</span></Link>
        <Link href="/admin/enrolments"><strong>Manage enrolments</strong><span>Review a learner-context access decision.</span></Link>
        <Link href="/admin/courses"><strong>Course preview</strong><span>Open administrator-only course previews.</span></Link>
      </section>
    </main>
  );
}
