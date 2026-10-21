import { SidebarNavigation } from "@/components/navigation/SidebarNavigation";
import { SignOutControl } from "@/components/auth/sign-out-control";
import { BrandingName } from "@/components/branding/BrandingName";
import { getCurrentSession, getUserRoles } from "@/server/auth/session";
import { isPlatformPrincipal } from "@/server/services/platform-principals";

export async function LearnerSidebar() {
  const session = await getCurrentSession();
  const roles = session ? await getUserRoles(session.accessToken) : [];
  const isAdmin = roles.includes("admin");
  const principal = isAdmin && session ? await isPlatformPrincipal(session) : false;

  return (
    <aside className="learner-sidebar" aria-label="Learner navigation">
      <div>
        <p className="sidebar-eyebrow">Workspace navigation</p>
        <h2>
          <BrandingName />
        </h2>
        <p className="sidebar-guidance">
          Open a group, then choose the page you need.
        </p>
      </div>

      <SidebarNavigation items={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/catalogue", label: "Course catalogue" },
        { href: "/catalogue?view=my-learning", label: "Enrolled courses" },
        { href: "/profile", label: "Profile" },
        ...(session ? [
          { href: "/company", label: "Company workspaces" },
          { href: "/policies", label: "Policies and reviews" },
          { href: "/course-reviews", label: "Course reviews" },
        ] : []),
        ...(isAdmin ? [
          { href: "/admin", label: "Administration" },
          { href: "/admin/learners", label: "Learners" },
          { href: "/admin/invitations", label: "Invitations" },
          { href: "/admin/notifications", label: "Notifications" },
          { href: "/admin/test-messages", label: "Test messages" },
          { href: "/admin/certificates", label: "Certificate designs" },
          { href: "/admin/enrolments", label: "Manage enrolments" },
          { href: "/admin/assessments", label: "Scannex assessments" },
          { href: "/admin/courses", label: "Course preview" },
          { href: "/admin/payments", label: "Payments" },
          { href: "/admin/companies", label: "Companies and branding" },
          { href: "/admin/policies", label: "Platform policies" },
          ...(principal ? [{ href: "/admin/agreements", label: "Commercial drafts" }, { href: "/admin/service-costs", label: "Service cost register" }] : []),
          { href: "/admin/email-templates", label: "Email previews" },
        ] : []),
      ]} />

      <div className="sidebar-actions">
        <SignOutControl />
      </div>
    </aside>
  );
}
