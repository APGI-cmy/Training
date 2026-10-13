import { beforeEach, describe, expect, it, vi } from "vitest";
import { invitationErrorMessage } from "@/lib/invitations/redemption-feedback";

const mocks = vi.hoisted(() => ({ session: vi.fn(), rest: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ requireSession: mocks.session }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: mocks.rest }));
import { getInvitationEntryDestination } from "@/server/services/invitations/entry-destination";

describe("Invitation recovery and matching account", () => {
  beforeEach(() => vi.resetAllMocks());

  it("does not grant enrolment or change learner records when the signed-in email differs", async () => {
    mocks.session.mockResolvedValue({ user: { id: "admin-user", email: "admin@example.invalid" } });
    mocks.rest.mockImplementation(async (path: string) => {
      if (path.startsWith("/rest/v1/course_invitations?")) return Response.json([{
        id: "test-invitation", recipient_email: "learner@example.invalid", course_id: "scannex-training-programme",
        organisation_id: "test-organisation", expires_at: "2099-01-01T00:00:00Z", revoked_at: null, redeemed_at: null, status: "sent"
      }]);
      if (path === "/rest/v1/course_invitation_events") return new Response(null, { status: 201 });
      throw new Error("A mismatched account must not write learner or enrolment records");
    });
    expect(await getInvitationEntryDestination({ accessToken: "fixture", user: { id: "admin-user", email: "admin@example.invalid" } }, "test-token-only")).toEqual({ error: "email_mismatch" });
    expect(mocks.rest).toHaveBeenCalledOnce();
    expect(invitationErrorMessage("email_mismatch")).toContain("Sign out");
  });

  it("does not echo arbitrary error text from a link", () => {
    expect(invitationErrorMessage("private-or-untrusted-message")).not.toContain("private-or-untrusted-message");
    expect(invitationErrorMessage(undefined)).toBeNull();
  });

  it.each(["expired", "revoked", "invalid"])("explains how to recover from %s", error => {
    expect(invitationErrorMessage(error)).toContain("training administrator");
  });
});
