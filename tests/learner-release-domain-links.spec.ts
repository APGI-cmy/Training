import { beforeEach, expect, it, vi } from "vitest";
import { getApplicationUrl } from "@/server/services/application-url";
import { sendCourseInvitationEmail } from "@/server/services/email/send-course-invitation";
import { sendAccountConfirmationEmail } from "@/server/services/email/send-account-confirmation";
import { sendPasswordRecoveryEmail } from "@/server/services/email/send-password-recovery";

const send = vi.fn();
beforeEach(() => {
  vi.unstubAllEnvs(); vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://training.apgi.app");
  vi.stubEnv("RESEND_API_KEY", "offline-fixture"); vi.stubEnv("EMAIL_FROM", "training@example.invalid");
  vi.stubGlobal("fetch", send); send.mockReset(); send.mockImplementation(async () => Response.json({ id: "offline" }));
});
it.each(["production", "preview"])("generates invitation, confirmation and recovery links in their own %s environment", async environment => {
  vi.stubEnv("VERCEL_ENV", environment); vi.stubEnv("VERCEL_URL", "training-platform-fixture-rassie-ras-projects.vercel.app");
  const host = environment === "preview" ? "https://training-platform-fixture-rassie-ras-projects.vercel.app" : "https://training.apgi.app";
  await sendCourseInvitationEmail({ invitationId: "offline", recipientEmail: "learner@example.invalid", courseTitle: "Scannex", invitationToken: "fixture", expiresAt: "2026-12-01T00:00:00Z" });
  await sendAccountConfirmationEmail("learner@example.invalid", "fixture");
  await sendPasswordRecoveryEmail("learner@example.invalid", "fixture", "//external.invalid");
  expect(send).toHaveBeenCalledTimes(3);
  for (const [, init] of send.mock.calls) {
    const payload = JSON.parse(init.body); expect(payload.text).toContain(host);
    expect(payload.text).not.toContain("https://external.invalid");
    expect(payload.text).not.toContain("https://training-platform-kappa.vercel.app");
  }
});
it.each(["http://training.apgi.app", "https://user:secret@training.apgi.app", "https://training.apgi.app/path", "not a URL"])("fails closed for an invalid production base %s", value => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", value); expect(getApplicationUrl()).toBeNull();
});
it("does not send preview email to the production host when its preview host is missing", async () => {
  vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("VERCEL_URL", "");
  expect(await sendPasswordRecoveryEmail("learner@example.invalid", "fixture", "/dashboard")).toBe(false); expect(send).not.toHaveBeenCalled();
});
