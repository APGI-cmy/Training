"use server";

import { createHash } from "node:crypto";
import { adminRest } from "@/server/supabase/admin-rest";

export type InvitationRegistrationState = { ok?: boolean; error?: string; message?: string; continueUrl?: string };

function getPublicAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getInvitationSignInPath(token: string) {
  return `/alp-sign-in?next=${encodeURIComponent(`/invitations/${token}`)}`;
}

function getInvitationReturnUrl(token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl) return null;
  try {
    return new URL(getInvitationSignInPath(token), appUrl).toString();
  } catch {
    return null;
  }
}

export async function registerInvitedUser(_previousState: InvitationRegistrationState, formData: FormData): Promise<InvitationRegistrationState> {
  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!token || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    return { error: "Enter the invited email address and a password of at least 12 characters." };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitationResponse = await adminRest(`/rest/v1/course_invitations?select=recipient_email,expires_at,revoked_at,redeemed_at,status&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`);
  if (!invitationResponse.ok) return { error: "This invitation cannot be used. Request a new invitation from APGI." };

  const invitation = ((await invitationResponse.json()) as Array<{ recipient_email?: string; expires_at?: string; revoked_at?: string | null; redeemed_at?: string | null; status?: string }>)[0];
  const invitationEmail = invitation?.recipient_email?.trim().toLowerCase();
  if (!invitationEmail || invitationEmail !== email || invitation.revoked_at || invitation.redeemed_at || invitation.status === "revoked" || (invitation.expires_at && new Date(invitation.expires_at) <= new Date())) {
    return { error: "This invitation cannot be used. Request a new invitation from APGI." };
  }

  const auth = getPublicAuthConfig();
  const emailRedirectTo = getInvitationReturnUrl(token);
  if (!auth || !emailRedirectTo) return { error: "Account registration is not configured yet. Contact APGI support." };

  const response = await fetch(`${auth.url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: auth.anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password, options: { emailRedirectTo } }),
    cache: "no-store"
  });
  if (!response.ok) {
    // Keep the response generic so this page cannot be used to enumerate accounts.
    return { error: "We could not complete registration. If you already have an account, sign in using the invitation link instead." };
  }

  return {
    ok: true,
    message: "Your account has been created. Confirm your email if asked, then sign in to accept your course invitation.",
    continueUrl: getInvitationSignInPath(token)
  };
}
