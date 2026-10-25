import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rest: vi.fn(), email: vi.fn(), fetch: vi.fn(), store: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/server/auth/session", () => ({ getSupabaseRestUrl: (path: string) => `https://auth.example.invalid${path}`, storeVerifiedSession: mocks.store }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: mocks.rest }));
vi.mock("@/server/services/email/send-account-confirmation", () => ({ sendAccountConfirmationEmail: mocks.email }));
import { registerInvitedUser } from "@/server/actions/auth/register-invited-user";
import { confirmAccount } from "@/server/actions/auth/confirm-account";

const invitation = { recipient_email: "learner@example.invalid", expires_at: "2099-01-01T00:00:00Z", revoked_at: null, redeemed_at: null, status: "sent" };
function form(values: Record<string, string>) { const data = new FormData(); Object.entries(values).forEach(([key,value]) => data.set(key,value)); if(values.password&&!Object.hasOwn(values,'confirmation'))data.set('confirmation',values.password); return data; }

describe("Invited account confirmation and first profile", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-key"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
    mocks.email.mockResolvedValue(true);
    mocks.rest.mockImplementation(async (path: string) => {
      if (path.startsWith("/rest/v1/course_invitations?")) return Response.json([invitation]);
      if (path.includes("claim_password_recovery_budget")) return Response.json(true);
      if (path === "/auth/v1/admin/generate_link") return Response.json({ hashed_token: "secret-confirmation-token" });
      throw new Error("Unexpected account operation");
    });
  });
  it("creates only a validated invited email account and sends its confirmation via the production email service", async () => {
    const result = await registerInvitedUser({}, form({ token: "test-invite", email: "Learner@Example.invalid ", password: "fixture-password-only" }));
    expect(result.ok).toBe(true);
    const creation = mocks.rest.mock.calls.find(([path]) => path === "/auth/v1/admin/generate_link");
    expect(JSON.parse(creation![1].body)).toEqual({ type: "signup", email: "learner@example.invalid", password: "fixture-password-only" });
    expect(mocks.email).toHaveBeenCalledWith("learner@example.invalid", "secret-confirmation-token");
    expect(JSON.stringify(result)).not.toContain("secret-confirmation-token");
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it.each([
    { recipient_email: "someone-else@example.invalid" },
    { expires_at: "2020-01-01T00:00:00Z" },
    { expires_at: "invalid-date" },
    { revoked_at: "2026-10-13T00:00:00Z" },
    { redeemed_at: "2026-10-13T00:00:00Z" }
  ])("does not create or email an account for an invalid invitation: %j", async (override) => {
    mocks.rest.mockResolvedValue(Response.json([{ ...invitation, ...override }]));
    expect(await registerInvitedUser({}, form({ token: "test-invite", email: "learner@example.invalid", password: "fixture-password-only" }))).toHaveProperty("error");
    expect(mocks.rest).toHaveBeenCalledOnce(); expect(mocks.email).not.toHaveBeenCalled();
  });
  it("does not create another account after a signup email limit is reached", async () => {
    mocks.rest.mockImplementation(async (path: string) => path.startsWith("/rest/v1/course_invitations?") ? Response.json([invitation]) : Response.json(false));
    expect(await registerInvitedUser({}, form({ token: "test-invite", email: "learner@example.invalid", password: "fixture-password-only" }))).toHaveProperty("error");
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it("does not create an account when the two new passwords do not match",async()=>{
    expect((await registerInvitedUser({},form({token:'test-invite',email:'learner@example.invalid',password:'fixture-password-only',confirmation:'a-different-password'}))).error).toContain('do not match');
    expect(mocks.rest).not.toHaveBeenCalled();expect(mocks.email).not.toHaveBeenCalled();
  });
  it("reports a confirmation email failure without advancing to the profile", async () => {
    mocks.email.mockResolvedValue(false);
    const result = await registerInvitedUser({}, form({ token: "test-invite", email: "learner@example.invalid", password: "fixture-password-only" }));
    expect(result.error).toContain("confirmation email could not be sent");
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it("does not establish a session with an invalid or reused confirmation", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ msg: "expired" }, { status: 403 }));
    await expect(confirmAccount(form({ token_hash: "invalid-token" }))).rejects.toThrow("REDIRECT:/confirm-account?error=invalid_link");
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it("uses only the verified provider session and sends the confirmed learner straight to Profile", async () => {
    const providerSession = { access_token: "verified-token", refresh_token: "verified-refresh", user: { id: "verified-learner" } };
    mocks.fetch.mockResolvedValue(Response.json(providerSession));
    await expect(confirmAccount(form({ token_hash: "valid-token", user_id: "forged-user", next: "https://evil.invalid" }))).rejects.toThrow("REDIRECT:/profile?onboarding=required");
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({ token_hash: "valid-token", type: "email" });
    expect(mocks.store).toHaveBeenCalledWith(providerSession);
  });
});
