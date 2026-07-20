import Link from "next/link";
import { SignOutControl } from "@/components/auth/sign-out-control";

export function LearnerSidebar() {
  return (
    <aside className="learner-sidebar" aria-label="Learner navigation">
      <div>
        <p className="sidebar-eyebrow">Learner navigation</p>
        <h2>APGI Training</h2>
        <p className="sidebar-guidance">
          Public course information and governed learner routes are labelled separately.
        </p>
      </div>

      <nav className="sidebar-links" aria-label="Learner route navigation">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/courses/vpshr-level-0">
          <span>Public Level 0 landing</span>
          <small>Course information</small>
        </Link>
        <Link href="/learn/vpshr-level-0">
          <span>Gated Level 0 course</span>
          <small>Enrolment required</small>
        </Link>
        <Link href="/learn/vpshr-level-0/units/introduction">
          <span>First gated unit</span>
          <small>Enrolment required</small>
        </Link>
      </nav>

      <div className="sidebar-actions">
        <SignOutControl />
      </div>
    </aside>
  );
}
