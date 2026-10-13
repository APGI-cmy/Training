"use server";

import { redirect } from "next/navigation";
import { getSupabaseRestUrl, storeVerifiedSession } from "@/server/auth/session";

export async function confirmAccount(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const verifyUrl = getSupabaseRestUrl("/auth/v1/verify");
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let verified = false;
  if (tokenHash && tokenHash.length <= 512 && verifyUrl && publicKey) {
    try {
      const response = await fetch(verifyUrl, { method: "POST", headers: { apikey: publicKey, "content-type": "application/json" },
        body: JSON.stringify({ token_hash: tokenHash, type: "email" }), cache: "no-store" });
      const payload = await response.json() as { access_token?: string; refresh_token?: string; user?: { id?: string } };
      if (response.ok && payload.access_token && payload.user?.id) {
        await storeVerifiedSession(payload);
        verified = true;
      }
    } catch { /* Do not sign in or advance without successful verification. */ }
  }
  if (!verified) redirect("/confirm-account?error=invalid_link");
  redirect("/profile?onboarding=required");
}
