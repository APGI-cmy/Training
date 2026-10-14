"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";
export async function markNotificationRead(form: FormData) {
  const { session } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const r = await adminRest(`/rest/v1/admin_notifications?id=eq.${encodeURIComponent(id)}&recipient_user_id=eq.${session.user.id}`, { method: "PATCH", body: JSON.stringify({ read_at: new Date().toISOString() }) });
  if (!r.ok) throw new Error("Notification could not be updated.");
  revalidatePath("/admin/notifications");
}
