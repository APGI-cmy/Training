"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseBySlug } from "@/lib/courses";
import { adminRest } from "@/server/supabase/admin-rest";

const INVITATION_REASON_REQUIRED = "INVITATION_REASON_REQUIRED";
const invitationBases = new Set(["external_payment", "corporate_order", "complimentary_marketing", "internal_allocation", "other"]);

type InvitationBasis = "external_payment" | "corporate_order" | "complimentary_marketing" | "internal_allocation" | "other";

export type CreateInvitationState = {
  ok: boolean;
  invitationId?: string;
  token?: string;
  error?: string;
};

async function deleteInvitation(invitationId: string) {
  await adminRest(`/rest/v1/course_invitations?id=eq.${encodeURIComponent(invitationId)}`, { method: "DELETE" });
}

async function deleteOwnedPendingEnrolment(userId: string, courseId: string, invitationId: string) {
  await adminRest(
    `/rest/v1/course_enrolments?user_id=eq.${encodeURIComponent(userId)}&course_id=eq.${encodeURIComponent(courseId)}&status=eq.pending&metadata->>invitation_id=eq.${encodeURIComponent(invitationId)}`,
    { method: "DELETE" }
  );
}

export async function createInvitation(formData: FormData): Promise<CreateInvitationState> {
  const { session } = await requireAdmin();
  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim().toLowerCase();
  const courseId = String(formData.get("courseId") ?? "").trim();
  const basisValue = String(formData.get("basis") ?? "other");
  const reason = String(formData.get("reason") ?? "").trim();
  const expiresAt = String(formData.get("expiresAt") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const expiry = new Date(expiresAt);

  if (!recipientEmail || !courseId || !expiresAt) {
    return { ok: false, error: "INVITATION_FIELDS_REQUIRED" };
  }
  if (!invitationBases.has(basisValue)) return { ok: false, error: "INVITATION_BASIS_INVALID" };
  if (!getCourseBySlug(courseId)) return { ok: false, error: "INVITATION_COURSE_INVALID" };
  if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) return { ok: false, error: "INVITATION_EXPIRY_INVALID" };
  if (!reason.trim()) return { ok: false, error: INVITATION_REASON_REQUIRED };

  const basis = basisValue as InvitationBasis;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const response = await adminRest("/rest/v1/course_invitations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      recipient_email: recipientEmail,
      course_id: courseId,
      basis,
      reason,
      expires_at: expiry.toISOString(),
      token_hash: tokenHash,
      created_by: session.user.id,
      status: "pending",
      metadata: { reference: reference || null, company: company || null }
    })
  });

  if (!response.ok) return { ok: false, error: "INVITATION_CREATE_FAILED" };
  const rows = (await response.json()) as Array<{ id?: string }>;
  const invitationId = rows[0]?.id;
  if (!invitationId) return { ok: false, error: "INVITATION_CREATE_FAILED" };

  const profileResponse = await adminRest(
    `/rest/v1/profiles?select=user_id&email=ilike.${encodeURIComponent(recipientEmail)}&limit=1`
  );
  if (!profileResponse.ok) {
    await deleteInvitation(invitationId);
    return { ok: false, error: "INVITATION_RECIPIENT_LOOKUP_FAILED" };
  }

  const profiles = (await profileResponse.json()) as Array<{ user_id?: string }>;
  const recipientUserId = profiles[0]?.user_id;
  let pendingEnrolmentCreated = false;

  if (recipientUserId) {
    const existingResponse = await adminRest(
      `/rest/v1/course_enrolments?select=status&user_id=eq.${encodeURIComponent(recipientUserId)}&course_id=eq.${encodeURIComponent(courseId)}&limit=1`
    );
    if (!existingResponse.ok) {
      await deleteInvitation(invitationId);
      return { ok: false, error: "ENROLMENT_LOOKUP_FAILED" };
    }
    const existingRows = (await existingResponse.json()) as Array<{ status?: string }>;
    const existingStatus = existingRows[0]?.status;
    if (existingStatus === "enrolled") {
      await deleteInvitation(invitationId);
      return { ok: false, error: "RECIPIENT_ALREADY_ENROLLED" };
    }
    if (existingStatus === "revoked") {
      await deleteInvitation(invitationId);
      return { ok: false, error: "RECIPIENT_ACCESS_REVOKED" };
    }

    if (!existingStatus) {
      const pendingResponse = await adminRest("/rest/v1/course_enrolments", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: recipientUserId,
          course_id: courseId,
          status: "pending",
          source: "admin",
          access_granted_at: null,
          access_revoked_at: null,
          metadata: { invitation_id: invitationId, actorId: session.user.id, reason }
        })
      });
      if (!pendingResponse.ok) {
        await deleteInvitation(invitationId);
        return { ok: false, error: "PENDING_ENROLMENT_CREATE_FAILED" };
      }
      const pendingRows = (await pendingResponse.json()) as Array<{ user_id?: string }>;
      if (!pendingRows[0]?.user_id) {
        await deleteInvitation(invitationId);
        return { ok: false, error: "PENDING_ENROLMENT_CREATE_FAILED" };
      }
      pendingEnrolmentCreated = true;

      const pendingEvent = await adminRest("/rest/v1/course_enrolment_events", {
        method: "POST",
        body: JSON.stringify({
          event_key: `invitation:${invitationId}:pending:${randomUUID()}`,
          user_id: recipientUserId,
          course_id: courseId,
          event_type: "enrolment_requested",
          previous_status: null,
          next_status: "pending",
          metadata: { invitation_id: invitationId, actorId: session.user.id, reason }
        })
      });
      if (!pendingEvent.ok) {
        await deleteOwnedPendingEnrolment(recipientUserId, courseId, invitationId);
        await deleteInvitation(invitationId);
        return { ok: false, error: "PENDING_ENROLMENT_AUDIT_FAILED" };
      }
    }
  }

  const invitationEvent = await adminRest("/rest/v1/course_invitation_events", {
    method: "POST",
    body: JSON.stringify({
      invitation_id: invitationId,
      event_type: "created",
      actor_id: session.user.id,
      metadata: { basis, reason, pending_enrolment_created: pendingEnrolmentCreated }
    })
  });

  if (!invitationEvent.ok) {
    if (recipientUserId && pendingEnrolmentCreated) await deleteOwnedPendingEnrolment(recipientUserId, courseId, invitationId);
    await deleteInvitation(invitationId);
    return { ok: false, error: "INVITATION_AUDIT_FAILED" };
  }

  return { ok: true, invitationId, token };
}

export async function createInvitationWithState(
  _previousState: CreateInvitationState,
  formData: FormData
): Promise<CreateInvitationState> {
  return createInvitation(formData);
}
