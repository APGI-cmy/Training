import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const m = vi.hoisted(() => ({ rest: vi.fn(), deliver: vi.fn(), config: vi.fn(), capture: vi.fn() }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: m.rest }));
vi.mock("@/server/environment-isolation", () => ({ usesStagingMailCapture: m.capture }));
vi.mock("@/server/services/email/transactional-delivery", () => ({ emailConfiguration: m.config, deliverTransactionalEmail: m.deliver }));
import { recoverReviewAccount } from "@/server/services/invitations/recover-review-account";
const email = "reviewer@example.invalid";
const round = { id: "11111111-1111-4111-8111-111111111111", organisation_id: "org", status: "open", document: { cutoff: "2099-01-01T00:00:00Z", participants: [{ email, state: "invited" }] } };
let selected: unknown[];
beforeEach(() => {
  vi.resetAllMocks(); selected = [structuredClone(round)];
  m.config.mockReturnValue({ origin: new URL("https://training-platform-v2-staging.vercel.app") });
  m.capture.mockReturnValue(false); m.deliver.mockResolvedValue({ ok: true, providerMessageId: "provider-id" });
  m.rest.mockImplementation(async (path: string) => Response.json(path.includes("course_review_rounds?") ? selected : path.includes("organisations?") ? [{ id: "org" }] : null));
});
afterEach(() => vi.unstubAllEnvs());
describe("Reviewer account recovery", () => {
  it("sends a private direct setup link for an already assigned reviewer without creating an account or granting roles", async () => {
    await recoverReviewAccount(email);
    const sent = m.deliver.mock.calls[0][0];
    expect(sent.to).toBe(email); expect(sent.subject).toBe("Set up your APGI Training V2 password");
    const link = sent.text.match(/https:\/\/[^\s]+/)[0]; const url = new URL(link);
    expect(url.origin).toBe("https://training-platform-v2-staging.vercel.app");
    expect(url.pathname).toMatch(new RegExp(`^/course-reviews/${round.id}/join/[A-Za-z0-9_-]{43}$`));
    const saved = JSON.parse(m.rest.mock.calls.find(([p]) => p === "/rest/v1/course_review_join_tokens")![1].body);
    expect(saved).toEqual({ email, round_id: round.id, expires_at: round.document.cutoff, token_hash: createHash("sha256").update(url.pathname.split("/").at(-1)!).digest("hex") });
    expect(sent.tracking.category).toBe("account_recovery");
    expect(m.rest.mock.calls.some(([p]) => p.includes("/auth/") || p.includes("user_roles") || p.includes("course_invitations"))).toBe(false);
  });
  it.each(["declined", "finished"])("does not revive a %s assignment", async state => {
    selected = [{ ...round, document: { ...round.document, participants: [{ email, state }] } }];
    await recoverReviewAccount(email); expect(m.deliver).not.toHaveBeenCalled();
  });
  it.each([{ status: "cancelled" }, { status: "published" }, { document: { ...round.document, cutoff: "2020-01-01" } }, { document: { ...round.document, participants: [{ email: "other@example.invalid", state: "invited" }] } }])("rejects an ineligible review %j", async change => {
    selected = [{ ...round, ...change }]; await recoverReviewAccount(email); expect(m.deliver).not.toHaveBeenCalled();
  });
  it("does not send or create a token for an unknown address", async () => {
    selected = []; await recoverReviewAccount(email); expect(m.rest).toHaveBeenCalledOnce(); expect(m.deliver).not.toHaveBeenCalled();
  });
  it("preserves inactive-company restrictions", async () => {
    m.rest.mockImplementation(async (p: string) => Response.json(p.includes("organisations?") ? [] : selected));
    await recoverReviewAccount(email); expect(m.deliver).not.toHaveBeenCalled();
  });
  it("fails closed when mail capture is enabled", async () => {
    m.capture.mockReturnValue(true); await expect(recoverReviewAccount(email)).rejects.toThrow("EMAIL_DISABLED"); expect(m.deliver).not.toHaveBeenCalled();
  });
  it("reports provider rejection rather than claiming delivery", async () => {
    m.deliver.mockResolvedValue({ ok: false }); await expect(recoverReviewAccount(email)).rejects.toThrow("DELIVERY_FAILED");
  });
  it("does not email a link when token persistence fails", async () => {
    m.rest.mockImplementation(async (p: string) => p.includes("join_tokens") ? new Response(null, { status: 500 }) : Response.json(p.includes("organisations?") ? [{ id: "org" }] : selected));
    await expect(recoverReviewAccount(email)).rejects.toThrow("TOKEN_FAILED"); expect(m.deliver).not.toHaveBeenCalled();
  });
});
