import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rest: vi.fn(), email: vi.fn(), fetch: vi.fn(), signOut: vi.fn(), cookieGet: vi.fn(), cookieSet: vi.fn(), cookieDelete: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookieGet, set: mocks.cookieSet, delete: mocks.cookieDelete }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/server/auth/session", () => ({ getSupabaseRestUrl: (path: string) => `https://auth.example.invalid${path}`, signOut: mocks.signOut }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: mocks.rest }));
vi.mock("@/server/services/email/send-password-recovery", () => ({ sendPasswordRecoveryEmail: mocks.email }));
import { requestPasswordRecovery, beginPasswordReset, updateRecoveredPassword } from "@/server/actions/auth/password-recovery";
import { safeRecoveryNext } from "@/lib/auth/safe-recovery-next";

function form(values: Record<string, string>) {
  const data = new FormData(); Object.entries(values).forEach(([key, value]) => data.set(key, value)); return data;
}

describe("Password recovery safeguards", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-key-only"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
    mocks.email.mockResolvedValue(true);
    mocks.rest.mockImplementation(async (path: string) => path.includes("claim_password") ? Response.json(true) : Response.json({ hashed_token: "single-use-secret" }));
  });

  it("sends recovery only to the normalized email and never returns the link token", async () => {
    const result = await requestPasswordRecovery({}, form({ email: "Learner@Example.invalid ", next: "//evil.invalid" }));
    expect(mocks.email).toHaveBeenCalledWith("learner@example.invalid", "single-use-secret", "/dashboard");
    expect(JSON.stringify(result)).not.toContain("single-use-secret");
    expect(JSON.stringify(mocks.rest.mock.calls[0][1])).not.toContain("learner@example.invalid");
  });

  it("returns the same public response for a missing account", async () => {
    const known = await requestPasswordRecovery({}, form({ email: "learner@example.invalid" }));
    mocks.rest.mockImplementation(async (path: string) => path.includes("claim_password") ? Response.json(true) : new Response(null, { status: 404 }));
    const unknown = await requestPasswordRecovery({}, form({ email: "unknown@example.invalid" }));
    expect(unknown).toEqual(known);
    expect(mocks.email).toHaveBeenCalledOnce();
  });

  it("does not generate or email a link after a shared rate limit is reached", async () => {
    mocks.rest.mockResolvedValue(Response.json(false));
    expect(await requestPasswordRecovery({}, form({ email: "learner@example.invalid" }))).toHaveProperty("message");
    expect(mocks.rest).toHaveBeenCalledOnce(); expect(mocks.email).not.toHaveBeenCalled();
  });

  it("fails closed if the rate-limit store is unavailable", async () => {
    mocks.rest.mockResolvedValue(new Response(null, { status: 500 }));
    expect(await requestPasswordRecovery({}, form({ email: "learner@example.invalid" }))).toHaveProperty("error");
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it("does not create a recovery session for an expired or reused link", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ msg: "expired" }, { status: 403 }));
    await expect(beginPasswordReset(form({ token_hash: "expired-link" }))).rejects.toThrow("REDIRECT:/reset-password?error=invalid_link");
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("verifies recovery before storing a short-lived HttpOnly session and removes the link from the URL", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ access_token: "recovery-token", user: { id: "learner" } }));
    await expect(beginPasswordReset(form({ token_hash: "valid-link", next: "/learn/scannex-training-programme" }))).rejects.toThrow("REDIRECT:/reset-password");
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({ token_hash: "valid-link", type: "recovery" });
    expect(mocks.cookieSet).toHaveBeenCalledWith("alp_recovery_token", "recovery-token", expect.objectContaining({ httpOnly: true, sameSite: "strict", maxAge: 900 }));
  });

  it("rejects password changes without a verified recovery cookie", async () => {
    expect(await updateRecoveredPassword({}, form({ password: "test-password-only", confirmation: "test-password-only" }))).toHaveProperty("error");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("requires matching passwords before calling the provider", async () => {
    expect(await updateRecoveredPassword({}, form({ password: "test-password-only", confirmation: "different-password" }))).toEqual({ error: "The two passwords do not match." });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("updates only the account authenticated by the recovery token, clears it, and returns to sign in", async () => {
    mocks.cookieGet.mockImplementation((key: string) => key === "alp_recovery_token" ? { value: "verified-recovery-token" } : { value: "//evil.invalid" });
    mocks.fetch.mockResolvedValue(Response.json({ id: "learner" }));
    await expect(updateRecoveredPassword({}, form({ password: "test-password-only", confirmation: "test-password-only", user_id: "other-user" }))).rejects.toThrow("REDIRECT:/alp-sign-in?passwordReset=success&next=%2Fdashboard");
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(url).toBe("https://auth.example.invalid/auth/v1/user");
    expect(options.headers.authorization).toBe("Bearer verified-recovery-token");
    expect(JSON.parse(options.body)).toEqual({ password: "test-password-only" });
    expect(mocks.cookieDelete).toHaveBeenCalledWith("alp_recovery_token");
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it.each(["//evil.invalid", "/\\evil.invalid", "https://evil.invalid", "/path\nignored"])("blocks an unsafe return path: %s", value => {
    expect(safeRecoveryNext(value)).toBe("/dashboard");
  });
});
