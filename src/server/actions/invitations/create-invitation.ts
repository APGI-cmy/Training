"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseBySlug } from "@/lib/courses";
import { sendCourseInvitationEmail } from "@/server/services/email/send-course-invitation";
import { adminRest } from "@/server/supabase/admin-rest";

const invitationBases = new Set(["external_payment", "corporate_order", "complimentary_marketing", "internal_allocation", "other"]);

type InvitationBasis = "external_payment" | "corporate_order" | "complimentary_marketing" | "internal_allocation" | "other";

export type InvitationInput = {
  recipientEmail: string;
  courseId: string;
  basis: string;
  reason: string;
  expiresAt: string;
  reference?: string;
  company?: string;
};

export type CreateInvitationState = {
  ok: boolean;
  invitationId?: string;
  deliveryStatus?: "sent";
  error?: string;
};

type ActiveInvitation = { id: string; expires_at: string };
type ExistingEnrolment = { status?: "pending" | "enrolled" | "revoked" };

function normaliseInput(input: InvitationInput): InvitationInput {
  return {
    recipientEmail: input.recipientEmail.trim().toLowerCase(),
    courseId: input.courseId.trim(),
    basis: input.basis.trim(),
    reason: input.reason.trim(),
    expiresAt: input.expiresAt.trim(),
    reference: input.reference?.trim() || undefined,
    company: input.company?.trim() || undefined
  };
}

function validateInput(input: InvitationInput) {
  const expiry = new Date(input.expiresAt);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.recipientEmail) || !input.courseId || !input.expiresAt) return "INVITATION_FIELDS_REQUIRED";
  if (!invitationBases.has(input.basis)) return "INVITATION_BASIS_INVALID";
  if (!getCourseBySlug(input.courseId)) return "INVITATION_COURSE_INVALID";
  if (!input.reason) return "INVITATION_REASON_REQUIRED";
  if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) return "INVITATION_EXPIRY_INVALID";
  return null;
}

async function recordInvitationEvent(invitationId: string, eventType: "created" | "sent" | "expired" | "revoked" | "failed", actorId: string, metadata: Record<string, unknown>) {
  return adminRest("/rest/v1/course_invitation_events", {
    method: "POST",
    body: JSON.stringify({ invitation_id: invitationId, event_type: eventType, actor_id: actorId, metadata })
  });
}

async function expireExistingInvitation(invitationId: string, actorId: string) {
  const response = await adminRest(`/rest/v1/course_invitations?id=eq.${encodeURIComponent(invitationId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "expired" })
  });
  if (response.ok) await recordInvitationEvent(invitationId, "expired", actorId, { reason: "expired_before_new_invitation" });
}

async function revokeUndeliveredInvitation(invitationId: string, actorId: string, reason: string) {
  await adminRest(`/rest/v1/course_invitations?id=eq.${encodeURIComponent(invitationId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "revoked", revoked_at: new Date().toISOString() })
  });
  await recordInvitationEvent(invitationId, "failed", actorId, { reason });
}

async function removeOwnedPendingEnrolment(userId: string | undefined, courseId: string, invitationId: string) {
  if (!userId) return;
  await adminRest(
    `/rest/v1/course_enrolments?user_id=eq.${encodeURIComponent(userId)}&course_id=eq.${encodeURIComponent(courseId)}&status=eq.pending&metadata->>invitation_id=eq.${encodeURIComponent(invitationId)}`,
    { method: "DELETE" }
  );
}

async function ensureNoActiveInvitation(input: InvitationInput, actorId: string) {
  const response = await adminRest(
    `/rest/v1/course_invitations?select=id,expires_at&recipient_email=eq.${encodeURIComponent(input.recipientEmail)}&course_id=eq.${encodeURIComponent(input.courseId)}&status=in.(pending,sent)&order=created_at.desc&limit=1`
  );
  if (!response.ok) return "INVITATION_LOOKUP_FAILED";

  const existing = ((await response.json()) as ActiveInvitation[])[0];
  if (!existing) return null;
  if (new Date(existing.expires_at) <= new Date()) {
    await expireExistingInvitation(existing.id, actorId);
    return null;
  }
  return "PENDING_INVITATION_EXISTS";
}

async function createPendingEnrolmentIfApplicable(invitationId: string, input: InvitationInput, actorId: string) {
  const profileResponse = await adminRest(`/rest/v1/profiles?select=user_id&email=ilike.${encodeURIComponent(input.recipientEmail)}&limit=1`);
  if (!profileResponse.ok) return { ok: false as const, error: "INVITATION_RECIPIENT_LOOKUP_FAILED" };

  const recipientUserId = ((await profileResponse.json()) as Array<{ user_id?: string }>)[0]?.user_id;
  if (!recipientUserId) return { ok: true as const, pendingEnrolmentCreated: false, recipientUserId: undefined };

  const existingResponse = await adminRest(
    `/rest/v1/course_enrolments?select=status&user_id=eq.${encodeURIComponent(recipientUserId)}&course_id=eq.${encodeURIComponent(input.courseId)}&limit=1`
  );
  if (!existingResponse.ok) return { ok: false as const, error: "ENROLMENT_LOOKUP_FAILED" };

  const existingStatus = ((await existingResponse.json()) as ExistingEnrolment[])[0]?.status;
  if (existingStatus === "enrolled") return { ok: false as const, error: "RECIPIENT_ALREADY_ENROLLED" };
  if (existingStatus === "revoked") return { ok: false as const, error: "RECIPIENT_ACCESS_REVOKED" };
  if (existingStatus === "pending") return { ok: true as const, pendingEnrolmentCreated: false, recipientUserId };

  const pendingResponse = await adminRest("/rest/v1/course_enrolments", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: recipientUserId,
      course_id: input.courseId,
      status: "pending",
      source: "admin",
      access_granted_at: null,
      access_revoked_at: null,
      metadata: { invitation_id: invitationId, actor_id: actorId, reason: input.reason }
    })
  });
  if (!pendingResponse.ok) return { ok: false as const, error: "PENDING_ENROLMENT_CREATE_FAILED" };

  const eventResponse = await adminRest("/rest/v1/course_enrolment_events", {
    method: "POST",
    body: JSON.stringify({
      event_key: `invitation:${invitationId}:pending:${randomUUID()}`,
      user_id: recipientUserId,
      course_id: input.courseId,
      event_type: "enrolment_requested",
      previous_status: null,
      next_status: "pending",
      metadata: { invitation_id: invitationId, actor_id: actorId, reason: input.reason }
    })
  });
  if (!eventResponse.ok) return { ok: false as const, error: "PENDING_ENROLMENT_AUDIT_FAILED" };
  return { ok: true as const, pendingEnrolmentCreated: true, recipientUserId };
}

export async function createAndSendInvitation(input: InvitationInput, actorId?: string): Promise<CreateInvitationState> {
  const actor = actorId ?? (await requireAdmin()).session.user.id;
  const clean = normaliseInput(input);
  const validationError = validateInput(clean);
  if (validationError) return { ok: false, error: validationError };

  const activeInvitationError = await ensureNoActiveInvitation(clean, actor);
  if (activeInvitationError) return { ok: false, error: activeInvitationError };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitationResponse = await adminRest("/rest/v1/course_invitations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      recipient_email: clean.recipientEmail,
      course_id: clean.courseId,
      basis: clean.basis as InvitationBasis,
      reason: clean.reason,
      expires_at: new Date(clean.expiresAt).toISOString(),
      token_hash: tokenHash,
      created_by: actor,
      status: "pending",
      metadata: { reference: clean.reference ?? null, company: clean.company ?? null }
    })
  });
  if (!invitationResponse.ok) return { ok: false, error: "INVITATION_CREATE_FAILED" };

  const invitationId = ((await invitationResponse.json()) as Array<{ id?: string }>)[0]?.id;
  if (!invitationId) return { ok: false, error: "INVITATION_CREATE_FAILED" };

  const pendingResult = await createPendingEnrolmentIfApplicable(invitationId, clean, actor);
  if (!pendingResult.ok) {
    await revokeUndeliveredInvitation(invitationId, actor, pendingResult.error);
    return { ok: false, error: pendingResult.error };
  }

  const createdEvent = await recordInvitationEvent(invitationId, "created", actor, {
    basis: clean.basis,
    pending_enrolment_created: pendingResult.pendingEnrolmentCreated
  });
  if (!createdEvent.ok) {
    if (pendingResult.pendingEnrolmentCreated) await removeOwnedPendingEnrolment(pendingResult.recipientUserId, clean.courseId, invitationId);
    await revokeUndeliveredInvitation(invitationId, actor, "INVITATION_AUDIT_FAILED");
    return { ok: false, error: "INVITATION_AUDIT_FAILED" };
  }

  const course = getCourseBySlug(clean.courseId);
  const delivery = await sendCourseInvitationEmail({
    invitationId,
    recipientEmail: clean.recipientEmail,
    courseTitle: course?.title ?? clean.courseId,
    invitationToken: token,
    expiresAt: clean.expiresAt
  });
  if (!delivery.ok) {
    if (pendingResult.pendingEnrolmentCreated) await removeOwnedPendingEnrolment(pendingResult.recipientUserId, clean.courseId, invitationId);
    await revokeUndeliveredInvitation(invitationId, actor, delivery.error);
    return { ok: false, error: delivery.error };
  }

  const sentResponse = await adminRest(`/rest/v1/course_invitations?id=eq.${encodeURIComponent(invitationId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "sent" })
  });
  if (!sentResponse.ok) return { ok: false, error: "INVITATION_SENT_AUDIT_FAILED" };

  const sentEvent = await recordInvitationEvent(invitationId, "sent", actor, {
    idempotency_key: `course-invitation-${invitationId}`,
    provider_message_id: delivery.providerMessageId
  });
  if (!sentEvent.ok) return { ok: false, error: "INVITATION_SENT_AUDIT_FAILED" };

  return { ok: true, invitationId, deliveryStatus: "sent" };
}

export async function createInvitation(formData: FormData): Promise<CreateInvitationState> {
  return createAndSendInvitation({
    recipientEmail: String(formData.get("recipientEmail") ?? ""),
    courseId: String(formData.get("courseId") ?? ""),
    basis: String(formData.get("basis") ?? "other"),
    reason: String(formData.get("reason") ?? ""),
    expiresAt: String(formData.get("expiresAt") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    company: String(formData.get("company") ?? "")
  });
}

export async function createInvitationWithState(_previousState: CreateInvitationState, formData: FormData): Promise<CreateInvitationState> {
  return createInvitation(formData);
}
