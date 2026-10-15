import "server-only";
import { usesStagingMailCapture } from "@/server/environment-isolation";
import { adminRest } from "@/server/supabase/admin-rest";
import { sendCourseInvitationEmail } from "@/server/services/email/send-course-invitation";
import type { CreateInvitationState } from "@/server/actions/invitations/create-invitation";

export async function deliverStoredInvitation(input: {
  id: string;
  recipientEmail: string;
  role: "learner" | "admin" | "business_owner";
  courseTitle: string;
  token: string;
  expiresAt: string;
  actorId: string;
}): Promise<CreateInvitationState> {
  if (usesStagingMailCapture())
    return {
      ok: true,
      invitationId: input.id,
      deliveryStatus: "staging_link",
      invitationUrl: new URL(
        `/invitations/${input.token}`,
        process.env.NEXT_PUBLIC_APP_URL,
      ).toString(),
    };
  const delivered = await sendCourseInvitationEmail({
    invitationId: input.id,
    recipientEmail: input.recipientEmail,
    invitedRole: input.role,
    courseTitle: input.courseTitle,
    invitationToken: input.token,
    expiresAt: input.expiresAt,
  });
  if (!delivered.ok) {
    await adminRest("/rest/v1/course_invitation_events", {
      method: "POST",
      body: JSON.stringify({
        invitation_id: input.id,
        event_type: "failed",
        actor_id: input.actorId,
        metadata: { reason: delivered.error },
      }),
    });
    return { ok: false, error: delivered.error };
  }
  const status = await adminRest(
    `/rest/v1/course_invitations?id=eq.${input.id}&status=in.(pending,sent)`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "sent" }),
    },
  );
  const audit = await adminRest("/rest/v1/course_invitation_events", {
    method: "POST",
    body: JSON.stringify({
      invitation_id: input.id,
      event_type: "sent",
      actor_id: input.actorId,
      metadata: {
        provider_message_id: delivered.providerMessageId,
        environment: "v2-staging",
      },
    }),
  });
  if (!status.ok || !(await status.json()).length || !audit.ok)
    return { ok: false, error: "INVITATION_SENT_AUDIT_FAILED" };
  return { ok: true, invitationId: input.id, deliveryStatus: "sent" };
}
