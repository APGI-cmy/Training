import { NextRequest, NextResponse } from "next/server";
import { safeRecoveryNext } from "@/lib/auth/safe-recovery-next";
import { getSupabaseRestUrl } from "@/server/auth/session";

const RECOVERY_COOKIE = "alp_recovery_token";
const NEXT_COOKIE = "alp_recovery_next";

function invalidLinkResponse(request: NextRequest) {
  const destination = request.nextUrl.clone();
  destination.pathname = "/reset-password";
  destination.search = "?error=invalid_link";
  return NextResponse.redirect(destination, 303);
}

/**
 * Exchanges the one-time recovery link token for a short-lived reset session.
 *
 * This deliberately uses a conventional form POST rather than a Next Server
 * Action. Some embedded and corporate browser contexts send an Origin value of
 * `null`, which Next rejects before a Server Action can verify the token. The
 * endpoint remains safe because it acts only on the single-use, high-entropy
 * token from the email and creates no session unless Supabase verifies it.
 */
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return invalidLinkResponse(request);
  }

  const tokenHash = String(formData.get("token_hash") ?? "");
  const next = safeRecoveryNext(String(formData.get("next") ?? ""));
  const verifyUrl = getSupabaseRestUrl("/auth/v1/verify");
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!tokenHash || tokenHash.length > 512 || !verifyUrl || !publicKey) return invalidLinkResponse(request);

  let token: string | undefined;
  try {
    const verified = await fetch(verifyUrl, {
      method: "POST",
      headers: { apikey: publicKey, "content-type": "application/json" },
      body: JSON.stringify({ token_hash: tokenHash, type: "recovery" }),
      cache: "no-store"
    });
    const payload = await verified.json() as { access_token?: string; user?: { id?: string } };
    if (verified.ok && payload.user?.id) token = payload.access_token;
  } catch {
    // An unavailable provider must not create a recovery session.
  }
  if (!token) return invalidLinkResponse(request);

  const destination = request.nextUrl.clone();
  destination.pathname = "/reset-password";
  destination.search = "";
  const response = NextResponse.redirect(destination, 303);
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 15 * 60
  };
  response.cookies.set(RECOVERY_COOKIE, token, options);
  response.cookies.set(NEXT_COOKIE, next, options);
  return response;
}
