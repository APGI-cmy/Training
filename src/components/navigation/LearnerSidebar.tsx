import Link from "next/link";
import { SignOutControl } from "@/components/auth/sign-out-control";
import { getCurrentSession, getUserRoles } from "@/server/auth/session";

export async function LearnerSidebar() {
  const session = await getCurrentSession();
  const roles = session ? await getUserRoles(session.accessToken) : [];
  const isAdmin = roles.includes("admin");

  return (
    <aside className="learner-sidebar" aria-label="Learner navigation">
      <div>
        <p className="sidebar-eyebrow">Learner navigation</p>
        <h2>APGI Training</h2>
        <p className="sidebar-guidance">Browse your learning, discover courses, and manage your profile.</p>
      </div>

      <nav className="sidebar-links" aria-label="Learner route navigation">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/catalogue">Course catalogue</Link>
        <Link href="/catalogue?view=my-learning">My learning</Link>
        <Link href="/profile">Profile</Link>
        {isAdmin ? <Link href="/admin">Administration</Link> : null}
        {isAdmin ? <Link href="/admin/invitations">Invitations</Link> : null}
        {isAdmin ? <Link href="/admin/enrolments">Manage enrolments</Link> : null}
        {isAdmin ? <Link href="/admin/courses">Course preview</Link> : null}
      </nav>

      <div className="sidebar-actions">
        <SignOutControl />
      </div>
    </aside>
  );
}
