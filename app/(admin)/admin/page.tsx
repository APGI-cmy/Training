import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";
import { isPlatformPrincipal } from "@/server/services/platform-principals";

export default async function AdminPage() {
  const { session } = await requireAdmin();
  const principal = await isPlatformPrincipal(session);
  const response = await adminRest(
    `/rest/v1/admin_notifications?recipient_user_id=eq.${session.user.id}&read_at=is.null&select=id&limit=100`,
  );
  const unread = response.ok
    ? ((await response.json()).length as number)
    : null;
  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Learner management</h1>
          <p>
            Find learners, prepare enrolment work and preview published courses
            from one governed workspace.
          </p>
        </div>
      </header>
      <section className="admin-launch-grid">
        <Link href="/admin/learners">
          <strong>Learners</strong>
          <span>Search learner records and course relationships.</span>
        </Link>
        <Link href="/admin/invitations">
          <strong>Invite and import</strong>
          <span>Prepare invitation and bulk-import drafts safely.</span>
        </Link>
        <Link href="/admin/notifications">
          <strong>
            Notifications
            {unread ? ` (${unread === 100 ? "100+" : unread} unread)` : ""}
          </strong>
          <span>
            {unread === null
              ? "Notifications are temporarily unavailable."
              : "See accepted invitations and new learner enrolments."}
          </span>
        </Link>
        <Link href="/admin/certificates">
          <strong>Certificate designs</strong>
          <span>
            Choose an organisation certificate style and review issued
            certificates.
          </span>
        </Link>
        <Link href="/admin/enrolments">
          <strong>Manage enrolments</strong>
          <span>Review a learner-context access decision.</span>
        </Link>
        <Link href="/admin/courses">
          <strong>Course preview</strong>
          <span>Open administrator-only course previews.</span>
        </Link>
        <Link href="/admin/companies">
          <strong>Companies and branding</strong>
          <span>
            Manage company brands, owners, course assignments and certificates.
          </span>
        </Link>
        <Link href="/admin/policies">
          <strong>Platform policies</strong>
          <span>File policy versions and request recorded approvals.</span>
        </Link>
        {principal ? <Link href="/admin/agreements">
          <strong>Commercial drafts</strong>
          <span>Prepare unapproved cost and revenue agreements.</span>
        </Link> : null}
        <Link href="/admin/payments">
          <strong>Payments</strong>
          <span>Set course prices and prepare recipient allocation rules.</span>
        </Link>
      </section>
    </main>
  );
}
