import "server-only";
import { randomUUID } from "node:crypto";

export async function sendAccountConfirmationEmail(email: string, tokenHash: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!apiKey || !from || !appUrl || /[\r\n]/.test(email + from)) return false;
  const origin = new URL(appUrl);
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") return false;
  const confirmationUrl = new URL("/confirm-account", origin);
  confirmationUrl.searchParams.set("token_hash", tokenHash);
  const url = confirmationUrl.toString();
  const htmlUrl = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const response = await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": `account-confirmation-${randomUUID()}` },
    body: JSON.stringify({ from, to: [email], subject: "Confirm your APGI Training account",
      html: `<p>Welcome to APGI Training.</p><p><a href="${htmlUrl}">Confirm your email and complete your profile</a></p><p>After confirming your email, complete and save your profile. Your enrolled course will then appear on your dashboard.</p><p>This link expires and can only be used once. If you did not create this account, ignore this email.</p>`,
      text: `Welcome to APGI Training. Confirm your email and complete your profile: ${url}\n\nAfter confirming your email, complete and save your profile. Your enrolled course will then appear on your dashboard. This link expires and can only be used once. If you did not create this account, ignore this email.` }), cache: "no-store" });
  return response.ok;
}
