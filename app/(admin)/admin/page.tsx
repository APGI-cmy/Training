import Link from "next/link";

export default function AdminPage() {
  return (
    <main>
      <h2>Administration overview</h2>
      <p>Create governed learner invitations and manage course access.</p>
      <Link className="button-link" href="/admin/invitations">Manage invitations</Link>
    </main>
  );
}
