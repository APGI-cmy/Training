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
  organisationId: "22222222-2222-4222-8222-222222222222",
  expiresAt: "2099-01-01T00:00:00Z",
};

describe("First-learner release invitation authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ALP_ENVIRONMENT", "production");
    vi.stubEnv('ALP_DEFAULT_ORGANISATION_ID',input.organisationId!);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('holds a published production invitation without sending, exposing a token or revoking it',async()=>{
    vi.stubEnv('ALP_ENVIRONMENT','training-production');vi.stubEnv('ALP_EMAIL_MODE','disabled');
    mocks.requireAdmin.mockResolvedValue({session:{user:{id:'real-admin'}}});
    mocks.adminRest.mockImplementation(async(path:string)=>Response.json(path.startsWith('/rest/v1/organisations?')?[{id:'22222222-2222-4222-8222-222222222222',default_referral_share_bps:0}]:path.startsWith('/rest/v1/organisation_offerings?')?[{id:'published'}]:path==='/rest/v1/course_invitations'?[{id:'held-invitation'}]:[]));
    const result=await createAndSendInvitation(input);
    expect(result).toEqual({ok:true,invitationId:'held-invitation',deliveryStatus:'held'});expect(mocks.send).not.toHaveBeenCalled();
    const row=JSON.parse(mocks.adminRest.mock.calls.find(([path])=>path==='/rest/v1/course_invitations')![1].body);
    expect(row.status).toBe('pending');expect(row.metadata.delivery_hold).toBe('awaiting_nks_dns');expect(row).not.toHaveProperty('token');
    expect(mocks.adminRest.mock.calls.some(([,init])=>init?.method==='PATCH'||init?.method==='DELETE')).toBe(false);
  });

  it('blocks production invitations for an unpublished course even while mail is held',async()=>{
    vi.stubEnv('ALP_ENVIRONMENT','training-production');vi.stubEnv('ALP_EMAIL_MODE','disabled');
    mocks.requireAdmin.mockResolvedValue({session:{user:{id:'real-admin'}}});
    mocks.adminRest.mockImplementation(async(path:string)=>Response.json(path.startsWith('/rest/v1/organisations?')?[{id:'22222222-2222-4222-8222-222222222222',default_referral_share_bps:0}]:[]));
    expect(await createAndSendInvitation(input)).toMatchObject({ok:false,error:expect.stringContaining('Assign and publish')});
    expect(mocks.adminRest.mock.calls.every(([,init])=>!init?.method||init.method==='GET')).toBe(true);expect(mocks.send).not.toHaveBeenCalled();
  });
  it('rejects a forged different company on the dedicated production site',async()=>{vi.stubEnv('ALP_ENVIRONMENT','training-production');vi.stubEnv('ALP_EMAIL_MODE','disabled');mocks.requireAdmin.mockResolvedValue({session:{user:{id:'real-admin'}}});expect(await createAndSendInvitation({...input,organisationId:'33333333-3333-4333-8333-333333333333'})).toMatchObject({ok:false,error:'INVITATION_ORGANISATION_INVALID'});expect(mocks.adminRest).not.toHaveBeenCalled();});

  it('counts held bulk invitations separately from emails actually sent',async()=>{
    vi.stubEnv('ALP_ENVIRONMENT','training-production');vi.stubEnv('ALP_EMAIL_MODE','disabled');
    mocks.requireAdmin.mockResolvedValue({session:{user:{id:'real-admin'}}});
    mocks.adminRest.mockImplementation(async(path:string)=>Response.json(path.startsWith('/rest/v1/organisations?')?[{id:'22222222-2222-4222-8222-222222222222',default_referral_share_bps:0}]:path.startsWith('/rest/v1/organisation_offerings?')?[{id:'published'}]:path==='/rest/v1/course_invitations'?[{id:'held-invitation'}]:[]));
    const result=await createBatchInvitations({invitations:[input,{...input,recipientEmail:'second@example.invalid'}]});
    expect(result).toMatchObject({created:2,sent:0,held:2,failed:0});expect(mocks.send).not.toHaveBeenCalled();
  });

  it("blocks V2 learner invitations until the company's course offering is published", async () => {
    vi.stubEnv("ALP_ENVIRONMENT", "v2-staging");
    mocks.requireAdmin.mockResolvedValue({
      session: { user: { id: "real-admin" } },
    });
    mocks.adminRest.mockImplementation(async (path: string) =>
      Response.json(
        path.startsWith("/rest/v1/organisations?")
          ? [{ id: "22222222-2222-4222-8222-222222222222", default_referral_share_bps: 0 }]
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
          { id: "22222222-2222-4222-8222-222222222222", default_referral_share_bps: 0 },
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
          { id: "22222222-2222-4222-8222-222222222222", default_referral_share_bps: 0 },
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
