import "server-only";
import { createHash } from "node:crypto";
import { adminRest } from "@/server/supabase/admin-rest";
import type { AlpSession } from "@/server/auth/session";

// Read-only: visiting an email link never grants or changes access. Profile
// submission grants valid invitations for the verified account email.
export async function getInvitationEntryDestination(
  session: AlpSession,
  token: string,
): Promise<{ destination?: string; error?: string }> {
  const hash = createHash("sha256").update(token).digest("hex");
  try {
    const response = await adminRest(
      `/rest/v1/course_invitations?select=recipient_email,invited_role,status,expires_at,revoked_at,redeemed_at,redeemed_by&token_hash=eq.${hash}&limit=1`,
    );
    if (!response.ok) return { error: "invitation_lookup_failed" };
    const [row] = (await response.json()) as Array<
      Record<string, string | null>
    >;
    if (!row) return { error: "invalid" };
    if (
      row.recipient_email?.trim().toLowerCase() !==
      session.user.email?.trim().toLowerCase()
    )
      return { error: "email_mismatch" };
    if (row.revoked_at || row.status === "revoked") return { error: "revoked" };
    if (row.redeemed_at || row.status === "redeemed")
      return row.redeemed_by === session.user.id
        ? {
            destination:
              row.invited_role === "admin"
                ? "/admin"
                : row.invited_role === "business_owner"
                  ? "/company"
                  : "/dashboard",
          }
        : { error: "reused" };
    if (!["pending", "sent"].includes(row.status ?? ""))
      return { error: "invalid" };
    if (
      !row.expires_at ||
      new Date(row.expires_at).getTime() <= Date.now() ||
      !Number.isFinite(new Date(row.expires_at).getTime())
    )
      return { error: "expired" };
    return { destination: "/profile?onboarding=required" };
  } catch {
    return { error: "invitation_lookup_failed" };
  }
}
