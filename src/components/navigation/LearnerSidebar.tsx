import Link from "next/link";
import { SignOutControl } from "@/components/auth/sign-out-control";
import { BrandingName } from "@/components/branding/BrandingName";
import { getCurrentSession, getUserRoles } from "@/server/auth/session";

export async function LearnerSidebar() {
  const session = await getCurrentSession();
  const roles = session ? await getUserRoles(session.accessToken) : [];
  const isAdmin = roles.includes("admin");

  return (
    <aside className="learner-sidebar" aria-label="Learner navigation">
      <div>
        <p className="sidebar-eyebrow">Learner navigation</p>
        <h2>
          <BrandingName />
        </h2>
        <p className="sidebar-guidance">
          Browse your learning, discover courses, and manage your profile.
        </p>
      </div>

      <nav className="sidebar-links" aria-label="Learner route navigation">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/catalogue">Course catalogue</Link>
        <Link href="/catalogue?view=my-learning">Enrolled courses</Link>
        <Link href="/profile">Profile</Link>
        {session ? <Link href="/company">Company workspaces</Link> : null}
        {session ? <Link href="/policies">Policies and reviews</Link> : null}
        {isAdmin ? <Link href="/admin">Administration</Link> : null}
        {isAdmin ? <Link href="/admin/learners">Learners</Link> : null}
        {isAdmin ? <Link href="/admin/invitations">Invitations</Link> : null}
        {isAdmin ? (
          <Link href="/admin/notifications">Notifications</Link>
        ) : null}
        {isAdmin ? (
          <Link href="/admin/test-messages">Test messages</Link>
        ) : null}
        {isAdmin ? (
          <Link href="/admin/certificates">Certificate designs</Link>
        ) : null}
        {isAdmin ? (
          <Link href="/admin/enrolments">Manage enrolments</Link>
        ) : null}
        {isAdmin ? (
          <Link href="/admin/assessments">Scannex assessments</Link>
        ) : null}
        {isAdmin ? <Link href="/admin/courses">Course preview</Link> : null}
        {isAdmin ? <Link href="/admin/payments">Payments</Link> : null}
        {isAdmin ? (
          <Link href="/admin/companies">Companies and branding</Link>
        ) : null}
        {isAdmin ? <Link href="/admin/policies">Platform policies</Link> : null}
        {isAdmin ? (
          <Link href="/admin/agreements">Commercial drafts</Link>
        ) : null}
        {isAdmin ? (
          <Link href="/admin/email-templates">Email previews</Link>
        ) : null}
      </nav>

      <div className="sidebar-actions">
        <SignOutControl />
      </div>
    </aside>
  );
}
