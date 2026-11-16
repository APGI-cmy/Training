import { beforeEach, describe, expect, it, vi } from "vitest";
const rest = vi.hoisted(() => vi.fn());
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: rest }));
import { getInvitationEntryDestination } from "@/server/services/invitations/entry-destination";
const session = { accessToken: "fixture", user: { id: "own-user", email: "learner@example.invalid" } };
const row = { recipient_email: session.user.email, status: "sent", expires_at: "2099-01-01T00:00:00Z", revoked_at: null, redeemed_at: null, redeemed_by: null };
describe("Invitation link without a separate acceptance step", () => {
  beforeEach(() => { rest.mockReset(); rest.mockResolvedValue(Response.json([row])); });
  it("routes a valid invitation directly to profile and performs no mutation", async () => {
    expect(await getInvitationEntryDestination(session, "private-fixture-token")).toEqual({ destination: "/profile?onboarding=required" });
    expect(rest).toHaveBeenCalledOnce();
    expect(rest.mock.calls[0]).toHaveLength(1);
    expect(rest.mock.calls[0][0]).not.toContain("private-fixture-token");
  });
  it("takes the same learner to the dashboard when their invitation was already used", async () => {
    rest.mockResolvedValue(Response.json([{ ...row, status: "redeemed", redeemed_at: "2026-10-13T12:00:00Z", redeemed_by: session.user.id }]));
    expect(await getInvitationEntryDestination(session, "fixture")).toEqual({ destination: "/dashboard" });
  });
  it.each([
    [{ recipient_email: "another@example.invalid" }, "email_mismatch"],
    [{ expires_at: "2020-01-01T00:00:00Z" }, "expired"],
    [{ expires_at: "invalid-date" }, "expired"],
    [{ status: "revoked" }, "revoked"],
    [{ status: "draft" }, "invalid"],
    [{ status: "redeemed", redeemed_by: "another-user" }, "reused"]
  ])("rejects an invalid invitation without granting access (%j)", async (patch, error) => {
    rest.mockResolvedValue(Response.json([{ ...row, ...patch }]));
    expect(await getInvitationEntryDestination(session, "fixture")).toEqual({ error });
    expect(rest).toHaveBeenCalledOnce();
  });
  it("fails closed when lookup is unavailable", async () => {
    rest.mockResolvedValue(new Response(null, { status: 503 }));
    expect(await getInvitationEntryDestination(session, "fixture")).toEqual({ error: "invitation_lookup_failed" });
  });
});
