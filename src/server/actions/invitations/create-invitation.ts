"use server";

import { createHash, randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";

const INVITATION_REASON_REQUIRED = "INVITATION_REASON_REQUIRED";

type InvitationBasis = "external_payment" | "corporate_order" | "complimentary_marketing" | "internal_allocation" | "other";

type CreateInvitationResult = {
  ok: boolean;
  invitationId?: string;
  token?: string;
  error?: string;
};

export async function createInvitation(formData: FormData): Promise<CreateInvitationResult> {
  const { session } = await requireAdmin();
  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim().toLowerCase();
  const courseId = String(formData.get("courseId") ?? "").trim();
  const basis = String(formData.get("basis") ?? "other") as InvitationBasis;
  const reason = String(formData.get("reason") ?? "").trim();
  const expiresAt = String(formData.get("expiresAt") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();

  if (!recipientEmail || !courseId || !expiresAt) {
    return { ok: false, error: "INVITATION_FIELDS_REQUIRED" };
  }

  if (!reason.trim()) {
    return { ok: false, error: INVITATION_REASON_REQUIRED };
  }

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
      expires_at: expiresAt,
      token_hash: tokenHash,
      created_by: session.user.id,
      status: "pending",
      metadata: { reference: reference || null, company: company || null }
    })
  });

  if (!response.ok) {
    return { ok: false, error: "INVITATION_CREATE_FAILED" };
  }

  const rows = (await response.json()) as Array<{ id: string }>;
  const invitationId = rows[0]?.id;

  if (invitationId) {
    await adminRest("/rest/v1/course_invitation_events", {
      method: "POST",
      body: JSON.stringify({
        invitation_id: invitationId,
        event_type: "created",
        actor_id: session.user.id,
        metadata: { basis, reason }
      })
    });
  }

  return { ok: true, invitationId, token };
}
