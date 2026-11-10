import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { refreshPortalSession } from "../src/server/auth/refresh-portal-session";
import { ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE } from "../src/server/auth/session-cookie-policy";

const jwt = (exp: number) => `header.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.unverified`;
const request = (access?: string, refresh?: string) => new NextRequest("https://training.example/dashboard", {
  headers: { cookie: [access && `${ACCESS_COOKIE}=${access}`, refresh && `${REFRESH_COOKIE}=${refresh}`, `${USER_COOKIE}=old-user`, "aws_session=unchanged"].filter(Boolean).join("; ") }
});
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("APGI login remains independent of the timed AWS Viewer", () => {
  it("does not create a login or contact any provider for an anonymous visitor", async () => {
    const response = await refreshPortalSession(request());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.cookies.getAll()).toEqual([]);
  });
  it("keeps a current APGI login without contacting AWS or renewing unnecessarily", async () => {
    const req = request(jwt(Date.now() / 1000 + 1800), "refresh-old");
    req.cookies.set("aws_session_expired", "true");
    const response = await refreshPortalSession(req);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.cookies.getAll()).toEqual([]);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
  });
  it.each([undefined, "malformed-token", jwt(1), jwt(Date.now() / 1000 + 30)])("renews a missing, malformed, expired or soon-expiring access token (%s)", async access => {
    fetchMock.mockResolvedValue(Response.json({ access_token: "verified-new-access", refresh_token: "refresh-new", user: { id: "provider-verified-user" } }));
    const req = request(access, "refresh-old");
    const response = await refreshPortalSession(req);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://auth.example/auth/v1/token?grant_type=refresh_token");
    expect(JSON.parse(options.body)).toEqual({ refresh_token: "refresh-old" });
    expect(options.cache).toBe("no-store");
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe("verified-new-access");
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe("refresh-new");
    expect(response.cookies.get(USER_COOKIE)?.value).toBe("provider-verified-user");
    expect(req.cookies.get(ACCESS_COOKIE)?.value).toBe("verified-new-access");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("alp_access_token=verified-new-access");
    expect(response.cookies.get(ACCESS_COOKIE)).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 28800 });
    expect(req.cookies.get("aws_session")?.value).toBe("unchanged");
    expect(response.cookies.get("aws_session")).toBeUndefined();
    expect(response.headers.get("location")).toBeNull();
  });
  it.each([400, 401, 403])("clears only APGI cookies after a definite refresh rejection (%s)", async status => {
    fetchMock.mockResolvedValue(new Response("invalid refresh", { status }));
    const req = request(jwt(1), "rejected-refresh");
    const response = await refreshPortalSession(req);
    expect(response.cookies.get(REFRESH_COOKIE)?.maxAge).toBe(0);
    expect(req.cookies.has(REFRESH_COOKIE)).toBe(false);
    expect(req.cookies.get("aws_session")?.value).toBe("unchanged");
    expect(response.cookies.get("aws_session")).toBeUndefined();
  });
  it.each([429, 500, 503])("does not sign the learner out during an authentication outage (%s)", async status => {
    fetchMock.mockResolvedValue(new Response("unavailable", { status }));
    const response = await refreshPortalSession(request(jwt(1), "keep-refresh"));
    expect(response.status).toBe(503);
    expect(response.cookies.getAll()).toEqual([]);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(response.headers.get("location")).toBeNull();
  });
  it("retains cookies after a network failure or malformed successful response", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network unavailable"));
    expect((await refreshPortalSession(request(jwt(1), "keep-refresh"))).cookies.getAll()).toEqual([]);
    fetchMock.mockResolvedValueOnce(Response.json({ access_token: "missing-rotation-and-user" }));
    expect((await refreshPortalSession(request(jwt(1), "keep-refresh"))).status).toBe(503);
  });
  it("leaves authorisation to the provider-verified session layer", () => {
    const session = readFileSync(new URL("../src/server/auth/session.ts", import.meta.url), "utf8");
    expect(session).toContain('getSupabaseRestUrl("/auth/v1/user")');
    expect(session).toContain("if (!user.id) return null");
    expect(session).not.toContain("user.id ?? userId");
  });
  it("keeps registration and invitations separate from the explicit Viewer launch", () => {
    for (const name of ["create-invitation", "accept-invitation"]) {
      const source = readFileSync(new URL(`../src/server/actions/invitations/${name}.ts`, import.meta.url), "utf8");
      expect(source).not.toMatch(/createViewerLabSession|CreateStreamingURL|appstream2\.aws/);
    }
    const destination = readFileSync(new URL("../src/lib/auth/post-sign-in-destination.ts", import.meta.url), "utf8");
    expect(destination).toContain('"/dashboard"');
    expect(destination).not.toContain("viewer-lab/launch");
    const viewer = readFileSync(new URL("../app/(learner)/learn/[courseSlug]/units/[unitSlug]/viewer-lab/page.tsx", import.meta.url), "utf8");
    expect(viewer).toContain('target="_blank"');
    expect(viewer).toContain('rel="noopener noreferrer"');
  });
});
