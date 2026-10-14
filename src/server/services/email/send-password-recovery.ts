import "server-only";
import { randomUUID } from "node:crypto";
import { safeRecoveryNext } from "@/lib/auth/safe-recovery-next";

export async function sendPasswordRecoveryEmail(email: string, tokenHash: string, next: string): Promise<boolean> {
  if (process.env.ALP_ENVIRONMENT === "v2-staging") return false;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!apiKey || !from || !appUrl || /[\r\n]/.test(email + from)) return false;
  const origin = new URL(appUrl);
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") return false;
  const recoveryUrl = new URL("/reset-password", origin);
  recoveryUrl.searchParams.set("token_hash", tokenHash);
  recoveryUrl.searchParams.set("next", safeRecoveryNext(next));
  const url = recoveryUrl.toString();
  const htmlUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": `password-recovery-${randomUUID()}` },
    body: JSON.stringify({ from, to: [email], subject: "Reset your APGI Training password",
      html: `<p>A password reset was requested for your APGI Training account.</p><p><a href="${htmlUrl}">Choose a new password</a></p><p>This link expires and can only be used once. If you did not request a reset, ignore this email. Your password will stay unchanged.</p>`,
      text: `A password reset was requested for your APGI Training account. Choose a new password: ${url}\n\nThis link expires and can only be used once. If you did not request a reset, ignore this email. Your password will stay unchanged.` }),
    cache: "no-store"
  });
  return response.ok;
}
