"use server";

import { createHash, randomUUID } from "node:crypto";
import { requireSession } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";

async function recordInvalidAttempt(actorId: string, tokenHash: string, failed: string) {
  await adminRest("/rest/v1/audit_events", {
    method: "POST",
    body: JSON.stringify({
      actor_user_id: actorId,
      target_user_id: actorId,
      event_type: "course_invitation_redemption_failed",
      entity_type: "course_invitation",
      metadata: { failed, token_hash_prefix: tokenHash.slice(0, 12) }
    })
  });
}

export async function acceptInvitation(token: string) {
  const session = await requireSession();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const response = await adminRest(
    `/rest/v1/course_invitations?select=id,recipient_email,course_id,expires_at,revoked_at,redeemed_at,status&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`
  );
  if (!response.ok) return { ok: false, error: "invitation_lookup_failed" };

  const rows = (await response.json()) as Array<Record<string, string | null>>;
  const invitation = rows[0];
  const now = new Date();
  const invitationEmail = invitation?.recipient_email?.trim().toLowerCase();
  const sessionEmail = session.user.email?.trim().toLowerCase();
  let failed = "";

  if (!invitation) failed = "invalid";
  else if (!invitationEmail || invitationEmail !== sessionEmail) failed = "email_mismatch";
  else if (invitation.expires_at && new Date(invitation.expires_at) <= now) failed = "expired";
  else if (invitation.revoked_at || invitation.status === "revoked") failed = "revoked";
  else if (invitation.redeemed_at || invitation.status === "redeemed") failed = "reused";

  if (failed || !invitation) {
    if (invitation?.id) {
      const failedEvent = await adminRest("/rest/v1/course_invitation_events", {
        method: "POST",
        body: JSON.stringify({
          invitation_id: invitation.id,
          event_type: "failed",
          actor_id: session.user.id,
          metadata: { failed }
        })
      });
      if (!failedEvent.ok) return { ok: false, error: "failed_event_write_failed" };
    } else {
      await recordInvalidAttempt(session.user.id, tokenHash, failed || "invalid");
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
  const enrolmentRows = (await upsert.json()) as Array<{ user_id?: string }>;
  if (!enrolmentRows[0]?.user_id) return { ok: false, error: "enrolment_failed" };

  const invitationUpdate = await adminRest(`/rest/v1/course_invitations?id=eq.${encodeURIComponent(invitation.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "redeemed", redeemed_at: now.toISOString(), redeemed_by: session.user.id })
  });
  if (!invitationUpdate.ok) return { ok: false, error: "invitation_update_failed" };
  const updatedInvitations = (await invitationUpdate.json()) as Array<{ id?: string }>;
  if (!updatedInvitations[0]?.id) return { ok: false, error: "invitation_update_failed" };

  const invitationEvent = await adminRest("/rest/v1/course_invitation_events", {
    method: "POST",
    body: JSON.stringify({
      invitation_id: invitation.id,
      event_type: "redeemed",
      actor_id: session.user.id,
      metadata: { idempotencyKey }
    })
  });
  if (!invitationEvent.ok) return { ok: false, error: "invitation_audit_failed" };

  const enrolmentEvent = await adminRest("/rest/v1/course_enrolment_events", {
    method: "POST",
    body: JSON.stringify({
      event_key: `${idempotencyKey}:${randomUUID()}`,
      user_id: session.user.id,
      course_id: invitation.course_id,
      event_type: "enrolment_granted",
      previous_status: "pending",
      next_status: "enrolled",
      metadata: { invitation_id: invitation.id, idempotencyKey }
    })
  });
  if (!enrolmentEvent.ok) return { ok: false, error: "enrolment_audit_failed" };

  return { ok: true, courseId: invitation.course_id };
}
