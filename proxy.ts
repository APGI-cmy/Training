import { NextRequest, NextResponse } from "next/server";

// Refresh only transports provider-verified credentials. Every page/API keeps
// its existing getCurrentSession, enrolment and database ownership checks.
function needsRefresh(token?: string) {
  if (!token) return true;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    // This unverified expiry is a scheduling hint, never an authorisation check.
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now() + 60_000;
  } catch { return true; }
}

export async function proxy(request: NextRequest) {
  const access = request.cookies.get("alp_access_token")?.value;
  const refresh = request.cookies.get("alp_refresh_token")?.value;
  const userId = request.cookies.get("alp_user_id")?.value;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!refresh || !userId || !baseUrl || !apiKey || !needsRefresh(access)) return NextResponse.next();

  try {
    const provider = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: apiKey, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    if (!provider.ok) return NextResponse.next();
    const session = await provider.json();
    if (typeof session.access_token !== "string" || !session.access_token ||
        typeof session.refresh_token !== "string" || !session.refresh_token || session.user?.id !== userId) {
      return NextResponse.next();
    }

    // Forward the refreshed cookies to THIS request as well as the browser.
    // This allows an already-open activity to recover on its next autosave,
    // without reloading its iframe or losing unsaved answers.
    const updated = [
      ["alp_access_token", session.access_token],
      ["alp_refresh_token", session.refresh_token],
      ["alp_user_id", session.user.id]
    ] as const;
    for (const [name, value] of updated) request.cookies.set(name, value);
    const response = NextResponse.next({ request: { headers: request.headers } });
    for (const [name, value] of updated) response.cookies.set(name, value, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    // Do not erase recoverable cookies during a transient provider/network
    // outage. Existing handlers still reject unauthenticated requests.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|courses/|training-packs/|images/|.*\\.[^/]+$).*)"]
};
