"use server";

import { createHash } from "node:crypto";
import { requireSession } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";

export async function acceptInvitation(token: string) {
  const session = await requireSession();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const response = await adminRest(
    `/rest/v1/course_invitations?select=id,recipient_email,course_id,expires_at,revoked_at,redeemed_at,status&token_hash=eq.${tokenHash}&limit=1`
  );
  const rows = response.ok ? ((await response.json()) as Array<Record<string, string | null>>) : [];
  const invitation = rows[0];
  const now = new Date();
  let failed = "";

  if (!invitation) failed = "invalid";
  else if (invitation.recipient_email !== session.user.email?.toLowerCase()) failed = "email_mismatch";
  else if (invitation.expires_at && new Date(invitation.expires_at) <= now) failed = "expired";
  else if (invitation.revoked_at) failed = "revoked";
  else if (invitation.redeemed_at) failed = "reused";

  if (failed || !invitation) {
    if (invitation?.id) {
      await adminRest("/rest/v1/course_invitation_events", {
        method: "POST",
        body: JSON.stringify({ invitation_id: invitation.id, event_type: "failed", actor_id: session.user.id, metadata: { failed } })
      });
    }
    return { ok: false, error: failed || "invalid" };
  }

  const idempotencyKey = `invitation:${invitation.id}:redeemed`;
  const upsert = await adminRest("/rest/v1/course_enrolments?on_conflict=user_id,course_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: session.user.id,
      course_id: invitation.course_id,
      status: "enrolled",
      source: "admin",
      access_granted_at: now.toISOString(),
      access_revoked_at: null,
      metadata: { invitation_id: invitation.id, idempotent: true }
    })
  });

  if (!upsert.ok) return { ok: false, error: "enrolment_failed" };

  await adminRest(`/rest/v1/course_invitations?id=eq.${invitation.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "redeemed", redeemed_at: now.toISOString(), redeemed_by: session.user.id })
  });
  await adminRest("/rest/v1/course_invitation_events", {
    method: "POST",
    body: JSON.stringify({ invitation_id: invitation.id, event_type: "redeemed", actor_id: session.user.id, metadata: { idempotencyKey } })
  });
  await adminRest("/rest/v1/course_enrolment_events", {
    method: "POST",
    body: JSON.stringify({
      event_key: idempotencyKey,
      user_id: session.user.id,
      course_id: invitation.course_id,
      event_type: "enrolment_granted",
      previous_status: "pending",
      next_status: "enrolled",
      metadata: { invitation_id: invitation.id }
    })
  });

  return { ok: true, courseId: invitation.course_id };
}
