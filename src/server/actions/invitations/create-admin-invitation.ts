"use server";
import { createHash, randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";
import type { InvitationInput, CreateInvitationState } from "./create-invitation";
import { deliverStoredInvitation } from "@/server/services/invitations/deliver-stored-invitation";
import { revalidatePath } from "next/cache";
export async function createAdminInvitation(input: InvitationInput): Promise<CreateInvitationState> {
  const { session } = await requireAdmin();
  const email = input.recipientEmail.trim().toLowerCase(); const expires = new Date(input.expiresAt);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !input.organisationId || !input.reason.trim() || !Number.isFinite(expires.getTime()) || expires <= new Date()) return { ok: false, error: "ADMIN_INVITATION_FIELDS_REQUIRED" };
  if (!input.confirmAdminAccess) return { ok: false, error: "CONFIRM_FULL_ADMIN_ACCESS" };
  const org = await adminRest(`/rest/v1/organisations?id=eq.${encodeURIComponent(input.organisationId)}&is_active=eq.true&select=id`);
  if (!org.ok || !(await org.json()).length) return { ok: false, error: "INVITATION_ORGANISATION_INVALID" };
  const existing = await adminRest(`/rest/v1/course_invitations?recipient_email=eq.${encodeURIComponent(email)}&invited_role=eq.admin&status=in.(pending,sent)&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id`);
  if (!existing.ok || (await existing.json()).length) return { ok: false, error: "ADMIN_INVITATION_ALREADY_EXISTS_OR_UNAVAILABLE" };
  const token = randomBytes(32).toString("base64url");
  const created = await adminRest("/rest/v1/course_invitations", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ recipient_email: email, course_id: null, invited_role: "admin", basis: "internal_allocation", reason: input.reason.trim(), organisation_id: input.organisationId, expires_at: expires.toISOString(), token_hash: createHash("sha256").update(token).digest("hex"), created_by: session.user.id, status: "pending" }) });
  if (!created.ok) return { ok: false, error: "ADMIN_INVITATION_CREATE_FAILED" };
  const [row] = await created.json();
  const audit = await adminRest("/rest/v1/course_invitation_events", { method: "POST", body: JSON.stringify({ invitation_id: row.id, event_type: "created", actor_id: session.user.id, metadata: { invited_role: "admin", full_access_confirmed: true } }) });
  if (!audit.ok) {
    await adminRest(`/rest/v1/course_invitations?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "revoked", revoked_at: new Date().toISOString() }) });
    return { ok: false, error: "INVITATION_AUDIT_FAILED" };
  }
  const result=await deliverStoredInvitation({id:row.id,recipientEmail:email,role:'admin',courseTitle:'Platform administration',token,expiresAt:expires.toISOString(),actorId:session.user.id});
  revalidatePath('/admin/invitations');
  return result;
}
