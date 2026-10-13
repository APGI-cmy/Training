"use server";

import { createHash } from "node:crypto";
import { adminRest } from "@/server/supabase/admin-rest";
import { claimAuthEmailBudget } from "@/server/services/auth-email-budget";
import { sendAccountConfirmationEmail } from "@/server/services/email/send-account-confirmation";

export type InvitationRegistrationState = { ok?: boolean; error?: string; message?: string; continueUrl?: string };

function getInvitationSignInPath(token: string) {
  return `/alp-sign-in?next=${encodeURIComponent(`/invitations/${token}`)}`;
}

export async function registerInvitedUser(_previousState: InvitationRegistrationState, formData: FormData): Promise<InvitationRegistrationState> {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!token || token.length > 512 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 256) {
    return { error: "Enter the invited email address and a password of at least 12 characters." };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitationResponse = await adminRest(`/rest/v1/course_invitations?select=recipient_email,expires_at,revoked_at,redeemed_at,status&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`);
  if (!invitationResponse.ok) return { error: "This invitation cannot be used. Request a new invitation from APGI." };

  const invitation = ((await invitationResponse.json()) as Array<{ recipient_email?: string; expires_at?: string; revoked_at?: string | null; redeemed_at?: string | null; status?: string }>)[0];
  const invitationEmail = invitation?.recipient_email?.trim().toLowerCase();
  if (!invitationEmail || invitationEmail !== email || invitation.revoked_at || invitation.redeemed_at || !["pending", "sent"].includes(invitation.status ?? "") || !invitation.expires_at || !(new Date(invitation.expires_at).getTime() > Date.now())) {
    return { error: "This invitation cannot be used. Request a new invitation from APGI." };
  }

  try {
    if (!(await claimAuthEmailBudget("signup", email))) return { error: "Please wait before requesting another account confirmation. You can sign in if you already have an account." };
    // Generate the signup confirmation through the auth provider, then deliver it
    // using the same production email service as course invitations.
    const generated = await adminRest("/auth/v1/admin/generate_link", {
      method: "POST", body: JSON.stringify({ type: "signup", email, password })
    });
    if (!generated.ok) return { error: "We could not complete registration. If you already have an account, sign in using the invitation link instead." };
    const payload = await generated.json() as { hashed_token?: string };
    if (!payload.hashed_token || !(await sendAccountConfirmationEmail(email, payload.hashed_token))) {
      return { error: "Your account confirmation email could not be sent. Please contact your training administrator, or use Forgot password if your account was created." };
    }
  } catch {
    return { error: "Account registration is temporarily unavailable. Please contact your training administrator." };
  }

  return {
    ok: true,
    message: "Check your email for ‘Confirm your APGI Training account’. Open it and confirm your email to go straight to your profile. After saving your profile, your enrolled course will appear on your dashboard.",
    continueUrl: getInvitationSignInPath(token)
  };
}
