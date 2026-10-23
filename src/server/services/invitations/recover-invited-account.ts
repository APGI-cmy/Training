import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { adminRest } from "@/server/supabase/admin-rest";
import { getCourseBySlug } from "@/lib/courses";
import { deliverStoredInvitation } from "./deliver-stored-invitation";
import { usesStagingMailCapture } from "@/server/environment-isolation";

type Invitation = {
  id: string; recipient_email: string; invited_role: "learner" | "admin" | "business_owner";
  course_id: string | null; organisation_id: string; expires_at: string;
  status: string; revoked_at: string | null; redeemed_at: string | null; token_hash: string;
};

// Called only after the shared recovery budget and Auth's account-not-found
// response. Reissue an existing invitation; never create accounts or grant roles.
export async function recoverInvitedAccount(email: string): Promise<void> {
  const now = new Date().toISOString();
  const found = await adminRest(`/rest/v1/course_invitations?recipient_email=eq.${encodeURIComponent(email)}&status=in.(pending,sent)&revoked_at=is.null&redeemed_at=is.null&expires_at=gt.${encodeURIComponent(now)}&select=id,recipient_email,invited_role,course_id,organisation_id,expires_at,status,revoked_at,redeemed_at,token_hash&order=created_at.desc&limit=20`);
  if (!found.ok) throw new Error("INVITATION_RECOVERY_LOOKUP_FAILED");
  const rows = await found.json() as Invitation[];
  for (const row of rows) {
    if (row.recipient_email?.trim().toLowerCase() !== email || row.revoked_at || row.redeemed_at ||
      !["pending", "sent"].includes(row.status) || !(Date.parse(row.expires_at) > Date.now()) ||
      !["learner", "admin", "business_owner"].includes(row.invited_role)) continue;
    const org = await adminRest(`/rest/v1/organisations?id=eq.${encodeURIComponent(row.organisation_id)}&is_active=eq.true&select=id&limit=1`);
    if (!org.ok) throw new Error("INVITATION_RECOVERY_LOOKUP_FAILED");
    if (!(await org.json()).length) continue;
    // Disabled-email staging must not expose a new invitation token publicly.
    if (usesStagingMailCapture()) throw new Error("INVITATION_RECOVERY_EMAIL_DISABLED");
    const recent = await adminRest(`/rest/v1/course_invitation_events?invitation_id=eq.${row.id}&event_type=eq.sent&occurred_at=gt.${encodeURIComponent(new Date(Date.now() - 60000).toISOString())}&select=id&limit=1`);
    if (!recent.ok) throw new Error("INVITATION_RECOVERY_LOOKUP_FAILED");
    if ((await recent.json()).length) return;
    const token = randomBytes(32).toString("base64url");
    // Preserve recipient, role, company, course and cutoff. A concurrent
    // redemption/revocation/resend cannot be overwritten by this request.
    const claim = await adminRest(`/rest/v1/course_invitations?id=eq.${row.id}&token_hash=eq.${row.token_hash}&recipient_email=eq.${encodeURIComponent(email)}&status=in.(pending,sent)&revoked_at=is.null&redeemed_at=is.null&expires_at=gt.${encodeURIComponent(now)}&select=id`, {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ token_hash: createHash("sha256").update(token).digest("hex"), status: "pending" })
    });
    if (!claim.ok) throw new Error("INVITATION_RECOVERY_CLAIM_FAILED");
    if (!(await claim.json()).length) return;
    const audit = await adminRest("/rest/v1/course_invitation_events", { method: "POST", body: JSON.stringify({
      invitation_id: row.id, event_type: "created", actor_id: null,
      metadata: { account_setup_recovery_requested: true }
    }) });
    if (!audit.ok) throw new Error("INVITATION_RECOVERY_AUDIT_FAILED");
    const delivered = await deliverStoredInvitation({ id: row.id, recipientEmail: row.recipient_email,
      role: row.invited_role, courseTitle: getCourseBySlug(row.course_id ?? "")?.title ?? "APGI Training",
      token, expiresAt: row.expires_at, actorId: null });
    if (!delivered.ok) throw new Error("INVITATION_RECOVERY_DELIVERY_FAILED");
    return;
  }
}
