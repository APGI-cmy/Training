import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  adminRest: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: mocks.adminRest }));
vi.mock("@/server/services/email/send-course-invitation", () => ({
  sendCourseInvitationEmail: mocks.send,
}));

import {
  createAndSendInvitation,
  type InvitationInput,
} from "../src/server/actions/invitations/create-invitation";
import { createBatchInvitations } from "../src/server/actions/invitations/create-batch-invitations";

const input: InvitationInput = {
  recipientEmail: "learner@example.invalid",
  courseId: "scannex-training-programme",
  basis: "internal_allocation",
  reason: "Automated release check",
  organisationId: "test-org",
  expiresAt: "2099-01-01T00:00:00Z",
};

describe("First-learner release invitation authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ALP_ENVIRONMENT", "production");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("blocks V2 learner invitations until the company's course offering is published", async () => {
    vi.stubEnv("ALP_ENVIRONMENT", "v2-staging");
    mocks.requireAdmin.mockResolvedValue({
      session: { user: { id: "real-admin" } },
    });
    mocks.adminRest.mockImplementation(async (path: string) =>
      Response.json(
        path.startsWith("/rest/v1/organisations?")
          ? [{ id: "test-org", default_referral_share_bps: 0 }]
          : [],
      ),
    );
    expect(await createAndSendInvitation(input)).toMatchObject({
      ok: false,
      error: expect.stringContaining("Assign and publish"),
    });
    expect(
      mocks.adminRest.mock.calls.every(
        ([, options]) => !options?.method || options.method === "GET",
      ),
    ).toBe(true);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it.each(["not signed in", "signed in without administrator rights"])(
    "denies %s even with a forged actor argument",
    async (reason) => {
      mocks.requireAdmin.mockRejectedValue(new Error(reason));
      const call = createAndSendInvitation as unknown as (
        value: InvitationInput,
        actor?: string,
      ) => ReturnType<typeof createAndSendInvitation>;
      await expect(call(input, "forged-admin-id")).rejects.toThrow(reason);
      expect(mocks.requireAdmin).toHaveBeenCalledOnce();
      expect(mocks.adminRest).not.toHaveBeenCalled();
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );

  it("denies unauthorized bulk invitation creation before any recipient is processed", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("not administrator"));
    await expect(
      createBatchInvitations({ invitations: [input] }),
    ).rejects.toThrow("not administrator");
    expect(mocks.adminRest).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("records the authenticated administrator and sends one hashed-token invitation", async () => {
    mocks.requireAdmin.mockResolvedValue({
      session: { user: { id: "real-admin" } },
    });
    mocks.adminRest.mockImplementation(async (path: string) => {
      if (path.startsWith("/rest/v1/organisations?"))
        return Response.json([
          { id: "test-org", default_referral_share_bps: 0 },
        ]);
      if (path.startsWith("/rest/v1/course_invitations?select="))
        return Response.json([]);
      if (path === "/rest/v1/course_invitations")
        return Response.json([{ id: "test-invitation" }]);
      if (path.startsWith("/rest/v1/profiles?")) return Response.json([]);
      return Response.json([]);
    });
    mocks.send.mockResolvedValue({
      ok: true,
      providerMessageId: "test-delivery",
    });
    expect(await createAndSendInvitation(input)).toMatchObject({
      ok: true,
      deliveryStatus: "sent",
    });
    const creation = mocks.adminRest.mock.calls.find(
      ([path]) => path === "/rest/v1/course_invitations",
    );
    const row = JSON.parse(creation![1].body);
    expect(row.created_by).toBe("real-admin");
    expect(row.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row).not.toHaveProperty("token");
    expect(mocks.send).toHaveBeenCalledOnce();
    const token = mocks.send.mock.calls[0][0].invitationToken;
    expect(JSON.stringify(row)).not.toContain(token);
  });

  it("returns a staging-only invitation link and never calls the email service", async () => {
    vi.stubEnv("ALP_ENVIRONMENT", "v2-staging");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://training-platform-v2-staging.vercel.app",
    );
    mocks.requireAdmin.mockResolvedValue({
      session: { user: { id: "real-admin" } },
    });
    mocks.adminRest.mockImplementation(async (path: string) => {
      if (path.startsWith("/rest/v1/organisations?"))
        return Response.json([
          { id: "test-org", default_referral_share_bps: 0 },
        ]);
      if (path === "/rest/v1/course_invitations")
        return Response.json([{ id: "test-invitation" }]);
      if (path.startsWith("/rest/v1/organisation_offerings?"))
        return Response.json([{ id: "published-offering" }]);
      return Response.json([]);
    });
    const result = await createAndSendInvitation(input);
    expect(result).toMatchObject({ ok: true, deliveryStatus: "staging_link" });
    expect(new URL(result.invitationUrl!).origin).toBe(
      "https://training-platform-v2-staging.vercel.app",
    );
    expect(mocks.send).not.toHaveBeenCalled();
    const row = JSON.parse(
      mocks.adminRest.mock.calls.find(
        ([path]) => path === "/rest/v1/course_invitations",
      )![1].body,
    );
    expect(row.status).toBe("pending");
    expect(JSON.stringify(row)).not.toContain(
      new URL(result.invitationUrl!).pathname.split("/").at(-1),
    );
  });
});
