"use server";

import { createInvitation } from "@/server/actions/invitations/create-invitation";

export async function createBatchInvitations(input: {
  recipientEmails: string[];
  courseId: string;
  basis: string;
  reason: string;
  expiresAt: string;
}) {
  const recipientResults = [] as Array<{ recipientEmail: string; ok: boolean; error?: string }>;

  for (const recipientEmail of input.recipientEmails) {
    const formData = new FormData();
    formData.set("recipientEmail", recipientEmail);
    formData.set("courseId", input.courseId);
    formData.set("basis", input.basis);
    formData.set("reason", input.reason);
    formData.set("expiresAt", input.expiresAt);
    const result = await createInvitation(formData);
    recipientResults.push({ recipientEmail, ok: result.ok, error: result.error });
  }

  return { recipientResults };
}
