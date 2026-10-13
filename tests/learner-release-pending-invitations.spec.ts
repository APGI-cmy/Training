import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), rest: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ requireSession: mocks.session }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: mocks.rest }));
import { getPendingCourseInvitations } from "@/server/services/invitations/pending-for-learner";
import { acceptPendingInvitations } from "@/server/actions/invitations/accept-invitation";

const session = { accessToken: "learner-token", user: { id: "actual-learner", email: "learner@example.invalid", email_confirmed_at: "2026-10-13T10:00:00Z" } };
const invitation = { id: "own-invitation", recipient_email: "learner@example.invalid", course_id: "scannex-training-programme", organisation_id: "organisation", expires_at: "2099-01-01T00:00:00Z", revoked_at: null, redeemed_at: null, status: "sent" };

describe("Verified mailbox invitation acceptance during onboarding", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue(session); });
  it("requires authentication before querying or granting anything", async () => {
    mocks.session.mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(acceptPendingInvitations()).rejects.toThrow("UNAUTHENTICATED");
    expect(mocks.rest).not.toHaveBeenCalled();
  });
  it("does not accept invitations on an unconfirmed email account", async () => {
    mocks.session.mockResolvedValue({ ...session, user: { ...session.user, email_confirmed_at: null } });
    expect(await acceptPendingInvitations()).toEqual({ ok: false, error: "email_unconfirmed" });
    expect(mocks.rest).not.toHaveBeenCalled();
  });
  it("filters other recipients, expired, revoked and reused invitations even if returned unexpectedly", async () => {
    mocks.rest.mockResolvedValue(Response.json([invitation,
      { ...invitation, id: "other", recipient_email: "other@example.invalid" },
      { ...invitation, id: "expired", expires_at: "2020-01-01T00:00:00Z" },
      { ...invitation, id: "revoked", status: "revoked" },
      { ...invitation, id: "reused", redeemed_at: "2026-10-13T09:00:00Z" }
    ]));
    expect(await getPendingCourseInvitations(session)).toEqual([invitation]);
    expect(mocks.rest.mock.calls[0][0]).toContain("recipient_email=eq.learner%40example.invalid");
  });
  it("fails closed when invitation lookup is unavailable", async () => {
    mocks.rest.mockResolvedValue(new Response(null, { status: 500 }));
    expect(await acceptPendingInvitations()).toEqual({ ok: false, error: "invitation_lookup_failed" });
    expect(mocks.rest).toHaveBeenCalledOnce();
  });
  it("grants only the matching authenticated learner's valid course and preserves saved profile details", async () => {
    mocks.rest.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path.startsWith("/rest/v1/course_invitations?select=")) return Response.json([invitation]);
      if (path.startsWith("/rest/v1/organisations?")) return Response.json([{ id: "organisation" }]);
      if (path.startsWith("/rest/v1/course_enrolments?")) return Response.json([{ user_id: session.user.id }]);
      if (path.startsWith("/rest/v1/course_invitations?id=")) return Response.json([{ id: invitation.id }]);
      if (options?.method === "POST") return new Response(null, { status: 201 });
      throw new Error("Unexpected invitation operation");
    });
    expect(await acceptPendingInvitations()).toEqual({ ok: true, courseIds: ["scannex-training-programme"] });
    const enrolment = mocks.rest.mock.calls.find(([path]) => path.startsWith("/rest/v1/course_enrolments?"));
    expect(JSON.parse(enrolment![1].body)).toMatchObject({ user_id: session.user.id, course_id: "scannex-training-programme", status: "enrolled" });
    const profile = mocks.rest.mock.calls.find(([path]) => path.startsWith("/rest/v1/profiles?"));
    expect(profile![1].headers.Prefer).toContain("ignore-duplicates");
  });
});
