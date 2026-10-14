"use server";

import { randomUUID } from "node:crypto";
import { requireSession, type AlpSession } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";
import { getPendingCourseInvitations } from "@/server/services/invitations/pending-for-learner";
import { getCourseBySlug } from "@/lib/courses";
import { getProfile } from "@/server/services/profiles";
import { isLearnerProfileComplete } from "@/lib/auth/learner-profile-completion";

async function ensureLearnerRecord(userId: string, email: string | undefined) {
  const learner = await adminRest("/rest/v1/learners?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: userId, status: "active" })
  });
  if (!learner.ok) return false;

  const role = await adminRest("/rest/v1/user_roles?on_conflict=user_id,role", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, role: "learner" })
  });
  if (!role.ok) return false;

  const profile = await adminRest("/rest/v1/profiles?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, email: email?.trim().toLowerCase() ?? null })
  });
  return profile.ok;
}

// Internal only: the profile enrolment action authenticates before this helper.
async function redeemInvitation(session: AlpSession, invitation: Record<string, string | null> | undefined) {
  const now = new Date();
  const invitationEmail = invitation?.recipient_email?.trim().toLowerCase();
  const sessionEmail = session.user.email?.trim().toLowerCase();
  let failed = "";

  if (!invitation?.id || !invitation.course_id || !invitation.organisation_id) failed = "invalid";
  else if (!invitationEmail || invitationEmail !== sessionEmail) failed = "email_mismatch";
  else if (invitation.expires_at && new Date(invitation.expires_at) <= now) failed = "expired";
  else if (invitation.revoked_at || invitation.status === "revoked") failed = "revoked";
  else if (invitation.redeemed_at || invitation.status === "redeemed") failed = "reused";

  if (failed || !invitation?.id || !invitation.course_id) {
    if (invitation?.id) {
      const failedEvent = await adminRest("/rest/v1/course_invitation_events", {
        method: "POST",
        body: JSON.stringify({ invitation_id: invitation.id, event_type: "failed", actor_id: session.user.id, metadata: { failed } })
      });
      if (!failedEvent.ok) return { ok: false, error: "failed_event_write_failed" };
    }
    return { ok: false, error: failed || "invalid" };
  }

  const invitationId = invitation.id;
  const courseId = invitation.course_id;
  const organisationId = invitation.organisation_id!;
  const idempotencyKey = `invitation:${invitationId}:redeemed`;

  if (!(await ensureLearnerRecord(session.user.id, session.user.email))) {
    return { ok: false, error: "learner_record_failed" };
  }

  const organisationResponse = await adminRest(`/rest/v1/organisations?id=eq.${encodeURIComponent(organisationId)}&is_active=eq.true&select=id&limit=1`);
  if (!organisationResponse.ok || !((await organisationResponse.json()) as Array<{ id?: string }>)[0]?.id) {
    return { ok: false, error: "organisation_unavailable" };
  }

  const membership = await adminRest("/rest/v1/learner_organisations?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: session.user.id, organisation_id: organisationId, assigned_by: null, source_invitation_id: invitationId, metadata: { assigned_from: "invitation" } })
  });
  if (!membership.ok) return { ok: false, error: "organisation_assignment_failed" };

  const upsert = await adminRest("/rest/v1/course_enrolments?on_conflict=user_id,course_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: session.user.id,
      course_id: courseId,
      status: "enrolled",
      source: "admin",
      organisation_id: organisationId,
      group_id: invitation.group_id ?? null,
      referral_share_bps: 0,
      access_granted_at: now.toISOString(),
      access_revoked_at: null,
      metadata: { invitation_id: invitationId, organisation_id: organisationId, idempotent: true }
    })
  });

  if (!upsert.ok) return { ok: false, error: "enrolment_failed" };
  const enrolmentRows = (await upsert.json()) as Array<{ user_id?: string }>;
  if (!enrolmentRows[0]?.user_id) return { ok: false, error: "enrolment_failed" };

  const invitationUpdate = await adminRest(`/rest/v1/course_invitations?id=eq.${encodeURIComponent(invitationId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "redeemed", redeemed_at: now.toISOString(), redeemed_by: session.user.id })
  });
  if (!invitationUpdate.ok) return { ok: false, error: "invitation_update_failed" };
  const updatedInvitations = (await invitationUpdate.json()) as Array<{ id?: string }>;
  if (!updatedInvitations[0]?.id) return { ok: false, error: "invitation_update_failed" };

  const invitationEvent = await adminRest("/rest/v1/course_invitation_events", {
    method: "POST",
    body: JSON.stringify({ invitation_id: invitationId, event_type: "redeemed", actor_id: session.user.id, metadata: { idempotencyKey } })
  });
  if (!invitationEvent.ok) return { ok: false, error: "invitation_audit_failed" };

  const enrolmentEvent = await adminRest("/rest/v1/course_enrolment_events", {
    method: "POST",
    body: JSON.stringify({
      event_key: `${idempotencyKey}:${randomUUID()}`,
      user_id: session.user.id,
      course_id: courseId,
      event_type: "enrolment_granted",
      previous_status: "pending",
      next_status: "enrolled",
      metadata: { invitation_id: invitationId, idempotencyKey }
    })
  });
  if (!enrolmentEvent.ok) return { ok: false, error: "enrolment_audit_failed" };

  return { ok: true, courseId };
}

export async function acceptPendingInvitations() {
  const session = await requireSession();
  if (!session.user.email_confirmed_at) return { ok: false, error: "email_unconfirmed" };
  try {
    if (!isLearnerProfileComplete(await getProfile(session))) return { ok: false, error: "profile_required" };
    const invitations = await getPendingCourseInvitations(session);
    const courseIds: string[] = [];
    for (const invitation of invitations) {
      if (invitation.invited_role === "admin") {
        const redeemed = await adminRest("/rest/v1/rpc/v2_redeem_admin_invitation", { method: "POST", body: JSON.stringify({ p_invitation: invitation.id, p_user: session.user.id }) });
        if (!redeemed.ok) return { ok: false, error: "admin_invitation_invalid" };
        continue;
      }
      if (!getCourseBySlug(invitation.course_id)) return { ok: false, error: "course_unavailable" };
      const result = await redeemInvitation(session, invitation);
      if (!result.ok || !result.courseId) return { ok: false, error: result.error ?? "redemption_failed" };
      courseIds.push(result.courseId);
    }
    return { ok: true, courseIds };
  } catch {
    return { ok: false, error: "invitation_lookup_failed" };
  }
}
