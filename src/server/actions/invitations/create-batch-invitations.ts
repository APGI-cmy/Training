"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAndSendInvitation, type InvitationInput } from "@/server/actions/invitations/create-invitation";

export type BatchInvitationResult = {
  recipientEmail: string;
  ok: boolean;
  error?: string;
};

export async function createBatchInvitations(input: { invitations: InvitationInput[] }) {
  const { session } = await requireAdmin();
  const unique = new Set<string>();
  const recipientResults: BatchInvitationResult[] = [];

  for (const invitation of input.invitations.slice(0, 250)) {
    const recipientEmail = invitation.recipientEmail.trim().toLowerCase();
    const duplicateKey = `${recipientEmail}:${invitation.courseId.trim()}`;
    if (unique.has(duplicateKey)) {
      recipientResults.push({ recipientEmail, ok: false, error: "DUPLICATE_IMPORT_ROW" });
      continue;
    }
    unique.add(duplicateKey);
    const result = await createAndSendInvitation(invitation, session.user.id);
    recipientResults.push({ recipientEmail, ok: result.ok, error: result.error });
  }

  return {
    recipientResults,
    sent: recipientResults.filter((result) => result.ok).length,
    failed: recipientResults.filter((result) => !result.ok).length
  };
}
