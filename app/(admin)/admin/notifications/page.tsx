import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";
import { markNotificationRead } from "@/server/actions/notifications";
import { getCourseBySlug } from "@/lib/courses";
export default async function NotificationsPage() {
  const { session } = await requireAdmin();
  const r = await adminRest(`/rest/v1/admin_notifications?recipient_user_id=eq.${session.user.id}&select=id,kind,message,course_id,created_at,read_at&order=created_at.desc&limit=100`);
  if (!r.ok) throw new Error("Notifications are temporarily unavailable.");
  const items = await r.json() as Array<{ id: string; kind: string; message: string; course_id: string; created_at: string; read_at: string | null }>;
  return <main className="admin-page"><h1>Notifications</h1><p>Your invitations generate a notification when a verified learner saves their profile and enrols, or an invited administrator joins. These are in-app notifications; invitation and account emails are handled separately.</p>{items.length ? items.map(n => <article className="admin-form-card" key={n.id}><strong>{n.message}</strong><p>{getCourseBySlug(n.course_id)?.title} · {new Date(n.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p>{n.read_at ? <span>Read</span> : <form action={markNotificationRead}><input type="hidden" name="id" value={n.id} /><button className="secondary-button">Mark as read</button></form>}</article>) : <p className="notice-card">No notifications yet.</p>}</main>;
}
