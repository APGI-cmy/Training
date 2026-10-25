import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({ rest: vi.fn(), deliver: vi.fn() }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: m.rest }));
vi.mock("@/server/auth/session", () => ({
  getSupabaseRestUrl: (p: string) => "https://isolated.example.invalid" + p,
}));
vi.mock("@/server/services/email/transactional-delivery", () => ({
  emailConfiguration: () => ({
    origin: new URL("https://training-platform-v2-staging.vercel.app"),
  }),
  deliverTransactionalEmail: m.deliver,
}));
import {
  brandedEmail,
  sendCourseInvitationEmail,
} from "@/server/services/email/send-course-invitation";
beforeEach(() => {
  vi.resetAllMocks();
  m.deliver.mockResolvedValue({ ok: true, providerMessageId: "fixture" });
  m.rest.mockImplementation(async (p: string) =>
    Response.json(
      p.includes("course_invitations")
        ? [
            {
              organisation_id: "company",
              course_id: "scannex-training-programme",
            },
          ]
        : [
            {
              name: "Partner Training",
              logo_path: "organisations/company/logo.png",
              primary_color: "#123456",
            },
          ],
    ),
  );
});
describe("Branded invitation templates", () => {
  it.each(['admin','learner','business_owner'] as const)('opens password setup directly for an invited %s without asking them to sign in',async invitedRole=>{
    await sendCourseInvitationEmail({invitationId:'fixture',recipientEmail:'invited@example.invalid',invitedRole,courseTitle:'Test course',invitationToken:'fixture-token',expiresAt:'2099-01-01',accountSetup:true});
    const mail=m.deliver.mock.calls[0][0];expect(mail.subject).toBe('Set up your APGI Training V2 password');
    expect(mail.html).toContain('/register?token=fixture-token&amp;setup=1');expect(mail.text).toContain('/register?token=fixture-token&setup=1');
    expect(mail.text).toContain('You do not need an existing password');expect(mail.text).toContain('confirm your own password');expect(mail.text).toContain('confirmation link');
    expect(mail.text).not.toContain('/invitations/fixture-token');expect(mail.html).not.toContain('Open your administrator invitation');expect(mail.idempotencyKey).toMatch(/^account-setup-/);
    expect(mail.to).toBe('invited@example.invalid');
  });
  it("uses the stored inviting company and real course cover without changing the verified destination", async () => {
    await sendCourseInvitationEmail({
      invitationId: "fixture",
      recipientEmail: "learner@example.invalid",
      courseTitle: "Scannex Training Programme",
      invitationToken: "fixture-token",
      expiresAt: "2099-01-01",
    });
    const mail = m.deliver.mock.calls[0][0];
    expect(mail.html).toContain("Partner Training");
    expect(mail.html).toContain("/images/course-covers/scannex-cover.png");
    expect(mail.html).toContain("Hosted by APGI");
    expect(mail.to).toBe("learner@example.invalid");
    expect(mail.html).toContain(
      "https://training-platform-v2-staging.vercel.app/invitations/fixture-token",
    );
  });
  it("explains the scoped company-owner role without promising global administrator rights", async () => {
    await sendCourseInvitationEmail({
      invitationId: "fixture",
      recipientEmail: "owner@example.invalid",
      invitedRole: "business_owner",
      courseTitle: "Company workspace",
      invitationToken: "fixture-token",
      expiresAt: "2099-01-01",
    });
    const mail = m.deliver.mock.calls[0][0];
    expect(mail.text).toContain(
      "does not grant APGI platform administrator access",
    );
    expect(mail.subject).toContain("company workspace");
  });
  it("escapes user-supplied brand text and rejects injected colour markup", () => {
    const html = brandedEmail({
      brand: "<script>bad</script>",
      color: 'red;\"onclick=bad',
      title: "A & B",
      description: "<img src=x>",
      link: "https://example.invalid",
      button: "Open",
      footer: "Test",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x>");
    expect(html).not.toContain("onclick=bad");
    expect(html).toContain("&lt;script&gt;");
  });
});
