"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";
import { validGroup } from "@/server/services/groups";
export async function createGroup(form: FormData) {
  const { session } = await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const organisationId = String(form.get("organisationId") ?? "");
  if (!name || name.length > 100 || !organisationId) throw new Error("Enter a group name and organisation.");
  const r = await adminRest("/rest/v1/learner_groups?on_conflict=organisation_id,name", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ name, organisation_id: organisationId, created_by: session.user.id }) });
  if (!r.ok) throw new Error("Group could not be saved.");
  revalidatePath("/admin/invitations"); revalidatePath("/admin/learners");
}
export async function assignLearnerGroup(form: FormData) {
  await requireAdmin();
  const userId = String(form.get("userId") ?? ""); const courseId = String(form.get("courseId") ?? "");
  const groupId = String(form.get("groupId") ?? "") || null;
  const q = `/rest/v1/course_enrolments?user_id=eq.${encodeURIComponent(userId)}&course_id=eq.${encodeURIComponent(courseId)}`;
  const r = await adminRest(`${q}&select=organisation_id`); const rows = r.ok ? await r.json() : [];
  if (!rows[0] || !(await validGroup(groupId ?? undefined, rows[0].organisation_id))) throw new Error("Choose a group in this learner's enrolled organisation.");
  const updated = await adminRest(q, { method: "PATCH", body: JSON.stringify({ group_id: groupId }) });
  if (!updated.ok) throw new Error("Group could not be assigned.");
  revalidatePath("/admin/learners");
}
