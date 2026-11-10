import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, portalCookieOptions } from "./session-cookie-policy";

const REFRESH_AHEAD_SECONDS = 60;

// This unverified claim only schedules renewal. It NEVER authorises a request:
// protected routes still verify the resulting token with Supabase in getCurrentSession.
function expiryForRenewal(token: string | undefined) {
  if (!token || token.length > 16_384) return 0;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" && Number.isFinite(payload.exp) ? payload.exp : 0;
  } catch { return 0; }
}

function privateResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function temporaryFailure() {
  return privateResponse(new NextResponse(
    "Your APGI login could not be renewed just now. Please reload this page in a few seconds. Your account and saved course progress have not been removed.",
    { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "5" } }
  ));
}

export async function refreshPortalSession(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return NextResponse.next();

  if (!refresh || expiryForRenewal(access) > Date.now() / 1000 + REFRESH_AHEAD_SECONDS) {
    return privateResponse(NextResponse.next());
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return temporaryFailure();

  try {
    const result = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });

    if (!result.ok) {
      // Outages and throttling must not delete an otherwise recoverable login.
      if (![400, 401, 403].includes(result.status)) return temporaryFailure();
      for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE]) request.cookies.delete(name);
      const response = privateResponse(NextResponse.next({ request: { headers: request.headers } }));
      for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE]) {
        response.cookies.set(name, "", { ...portalCookieOptions(), maxAge: 0 });
      }
      return response;
    }

    const payload = await result.json() as {
      access_token?: string; refresh_token?: string; user?: { id?: string };
    };
    if (!payload.access_token || !payload.refresh_token || !payload.user?.id) return temporaryFailure();

    const renewed = [
      [ACCESS_COOKIE, payload.access_token],
      [REFRESH_COOKIE, payload.refresh_token],
      [USER_COOKIE, payload.user.id]
    ] as const;
    for (const [name, value] of renewed) request.cookies.set(name, value);
    // Both the current server render AND the next browser request need the rotation.
    const response = privateResponse(NextResponse.next({ request: { headers: request.headers } }));
    for (const [name, value] of renewed) response.cookies.set(name, value, portalCookieOptions());
    return response;
  } catch {
    // Never log tokens, cookies, provider response bodies or invitation URLs.
    return temporaryFailure();
  }
}
