"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseRestUrl, signOut } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";
import { sendPasswordRecoveryEmail } from "@/server/services/email/send-password-recovery";
import { safeRecoveryNext } from "@/lib/auth/safe-recovery-next";
import { claimAuthEmailBudget } from "@/server/services/auth-email-budget";

export type PasswordRecoveryState = { error?: string; message?: string };
const RECOVERY_COOKIE = "alp_recovery_token";
const NEXT_COOKIE = "alp_recovery_next";
const GENERIC_MESSAGE = "If an account exists for this email address, a password-reset email will arrive shortly. Check your junk folder too.";

export async function requestPasswordRecovery(_state: PasswordRecoveryState, formData: FormData): Promise<PasswordRecoveryState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeRecoveryNext(String(formData.get("next") ?? ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "Enter the email address you use for APGI Training." };
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { error: "Password recovery is temporarily unavailable. Please contact APGI support." };
  try {
    if (!(await claimAuthEmailBudget("recovery", email))) return { message: GENERIC_MESSAGE };
    const generated = await adminRest("/auth/v1/admin/generate_link", {
      method: "POST", body: JSON.stringify({ type: "recovery", email })
    });
    // Do not reveal whether an account exists. Never return recovery tokens to the caller.
    if (!generated.ok) {
      if (generated.status >= 500 || generated.status === 401 || generated.status === 403) throw new Error("RECOVERY_SERVICE_UNAVAILABLE");
      return { message: GENERIC_MESSAGE };
    }
    const payload = await generated.json() as { hashed_token?: string };
    if (!payload.hashed_token || !(await sendPasswordRecoveryEmail(email, payload.hashed_token, next))) throw new Error("RECOVERY_EMAIL_UNAVAILABLE");
    return { message: GENERIC_MESSAGE };
  } catch {
    return { error: "Password recovery is temporarily unavailable. Please contact APGI support." };
  }
}

export async function beginPasswordReset(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const next = safeRecoveryNext(String(formData.get("next") ?? ""));
  const verifyUrl = getSupabaseRestUrl("/auth/v1/verify");
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieStore = await cookies();
  cookieStore.delete(RECOVERY_COOKIE);
  cookieStore.delete(NEXT_COOKIE);
  let token: string | undefined;
  if (tokenHash && tokenHash.length <= 512 && verifyUrl && publicKey) {
    try {
      const verified = await fetch(verifyUrl, { method: "POST", headers: { apikey: publicKey, "content-type": "application/json" },
        body: JSON.stringify({ token_hash: tokenHash, type: "recovery" }), cache: "no-store" });
      const payload = await verified.json() as { access_token?: string; user?: { id?: string } };
      if (verified.ok && payload.user?.id) token = payload.access_token;
    } catch { /* An unavailable provider must not create a recovery session. */ }
  }
  if (!token) redirect("/reset-password?error=invalid_link");
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: 15 * 60 };
  cookieStore.set(RECOVERY_COOKIE, token, options);
  cookieStore.set(NEXT_COOKIE, next, options);
  redirect("/reset-password");
}

export async function updateRecoveredPassword(_state: PasswordRecoveryState, formData: FormData): Promise<PasswordRecoveryState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 12) return { error: "Choose a password of at least 12 characters." };
  if (password.length > 256) return { error: "Choose a password of no more than 256 characters." };
  if (password !== confirmation) return { error: "The two passwords do not match." };
  const cookieStore = await cookies();
  const token = cookieStore.get(RECOVERY_COOKIE)?.value;
  const next = safeRecoveryNext(cookieStore.get(NEXT_COOKIE)?.value);
  const userUrl = getSupabaseRestUrl("/auth/v1/user");
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !userUrl || !publicKey) return { error: "Your reset session has expired. Request a new password-reset email." };
  const authHeaders = { apikey: publicKey, authorization: `Bearer ${token}`, "content-type": "application/json" };
  try {
    const updated = await fetch(userUrl, { method: "PUT", headers: authHeaders, body: JSON.stringify({ password }), cache: "no-store" });
    if (!updated.ok) {
      if (updated.status === 401 || updated.status === 403) {
        cookieStore.delete(RECOVERY_COOKIE);
        cookieStore.delete(NEXT_COOKIE);
        return { error: "Your reset session has expired. Request a new password-reset email." };
      }
      return { error: "The password could not be updated. Try a different password or request a new reset email." };
    }
    const logoutUrl = getSupabaseRestUrl("/auth/v1/logout?scope=global");
    if (logoutUrl) await fetch(logoutUrl, { method: "POST", headers: authHeaders, cache: "no-store" }).catch(() => null);
  } catch {
    return { error: "The password service could not be reached. Please try again." };
  }
  cookieStore.delete(RECOVERY_COOKIE);
  cookieStore.delete(NEXT_COOKIE);
  await signOut();
  redirect(`/alp-sign-in?passwordReset=success&next=${encodeURIComponent(next)}`);
}
