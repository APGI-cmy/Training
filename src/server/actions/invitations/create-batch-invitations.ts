"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAndSendInvitation, type InvitationInput } from "@/server/actions/invitations/create-invitation";

export type BatchInvitationResult = {
  recipientEmail: string;
  ok: boolean;
  error?: string;
  invitationUrl?: string;
  deliveryStatus?: 'sent'|'staging_link'|'held';
};

export async function createBatchInvitations(input: { invitations: InvitationInput[] }) {
  await requireAdmin();
  const unique = new Set<string>();
  const recipientResults: BatchInvitationResult[] = [];

  for (const invitation of input.invitations.slice(0, 250)) {
    if (invitation.role === "admin") { recipientResults.push({ recipientEmail: invitation.recipientEmail, ok: false, error: "ADMIN_INVITATIONS_REQUIRE_INDIVIDUAL_CONFIRMATION" }); continue; }
    const recipientEmail = invitation.recipientEmail.trim().toLowerCase();
    const duplicateKey = `${recipientEmail}:${invitation.courseId.trim()}`;
    if (unique.has(duplicateKey)) {
      recipientResults.push({ recipientEmail, ok: false, error: "DUPLICATE_IMPORT_ROW" });
      continue;
    }
    unique.add(duplicateKey);
    const result = await createAndSendInvitation(invitation);
    recipientResults.push({ recipientEmail, ok: result.ok, error: result.error, invitationUrl: result.invitationUrl,deliveryStatus:result.deliveryStatus });
  }

  return {
    recipientResults,
    created: recipientResults.filter((result) => result.ok).length,
    sent: recipientResults.filter((result) => result.ok&&result.deliveryStatus==='sent').length,
    held: recipientResults.filter((result) => result.ok&&result.deliveryStatus==='held').length,
    failed: recipientResults.filter((result) => !result.ok).length
  };
}
