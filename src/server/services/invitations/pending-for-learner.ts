import "server-only";
import { adminRest } from "@/server/supabase/admin-rest";
import type { AlpSession } from "@/server/auth/session";

export type PendingCourseInvitation = {
  id: string;
  recipient_email: string;
  course_id: string;
  organisation_id: string;
  expires_at: string;
  revoked_at: string | null;
  redeemed_at: string | null;
  status: string;
  invited_role?: "learner" | "admin" | "business_owner";
  group_id?: string | null;
};

export async function getPendingCourseInvitations(
  session: AlpSession,
): Promise<PendingCourseInvitation[]> {
  const email = session.user.email?.trim().toLowerCase();
  // A verified mailbox owner may accept their own invitations during onboarding.
  // The user ID/email always come from the authenticated provider response.
  if (!email || !session.user.email_confirmed_at) return [];
  const response = await adminRest(
    `/rest/v1/course_invitations?select=id,recipient_email,course_id,organisation_id,expires_at,revoked_at,redeemed_at,status,invited_role,group_id&recipient_email=eq.${encodeURIComponent(email)}&status=in.(pending,sent)&revoked_at=is.null&redeemed_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.asc&limit=20`,
  );
  if (!response.ok) throw new Error("PENDING_INVITATION_LOOKUP_FAILED");
  const rows = (await response.json()) as PendingCourseInvitation[];
  // Recheck these boundaries even if the upstream query returns unexpected rows.
  return rows.filter(
    (row) =>
      row.recipient_email?.trim().toLowerCase() === email &&
      ["pending", "sent"].includes(row.status) &&
      !row.revoked_at &&
      !row.redeemed_at &&
      Boolean(row.expires_at) &&
      new Date(row.expires_at).getTime() > Date.now(),
  );
}
