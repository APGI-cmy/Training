import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock('../src/server/services/email/staging-capture',()=>({captureStagingAuthEmail:vi.fn(async()=>true)}));
import { assertStagingIsolation, STAGING_DATABASE_REF, STAGING_ORIGIN, STAGING_PROJECT_ID } from "../src/server/environment-isolation";
import { sendCourseInvitationEmail } from "../src/server/services/email/send-course-invitation";
import { sendAccountConfirmationEmail } from "../src/server/services/email/send-account-confirmation";
import { sendPasswordRecoveryEmail } from "../src/server/services/email/send-password-recovery";
import { getViewerLabConfig } from "../src/lib/services/viewer-lab/viewer-lab-config";

const stage = {
  ALP_ENVIRONMENT: "v2-staging", ALP_STAGING_DATABASE_REF: STAGING_DATABASE_REF,
  VERCEL: "1", VERCEL_PROJECT_ID: STAGING_PROJECT_ID,
  NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_DATABASE_REF}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test_fixture",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test_fixture", NEXT_PUBLIC_APP_URL: STAGING_ORIGIN,
  ALP_EMAIL_MODE: "disabled", ALP_PAYMENTS_MODE: "disabled", SCANNEX_VIEWER_LAB_ENABLED: "false"
};

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("V2 isolation from enrolled V1 learners", () => {
  it("accepts only the explicitly configured staging resources", () => expect(() => assertStagingIsolation(stage)).not.toThrow());
  it.each([
    ["ALP_ENVIRONMENT", "production"],
    ["VERCEL_PROJECT_ID", "prj_ORt9BeL7D469cnEOZs04cyHD5s5y"],
    ["NEXT_PUBLIC_SUPABASE_URL", "https://ooujszdvncwijbuzpjfp.supabase.co"],
    ["SUPABASE_URL", "https://ooujszdvncwijbuzpjfp.supabase.co"],
    ["NEXT_PUBLIC_APP_URL", "https://training-platform-kappa.vercel.app"],
    ["RESEND_API_KEY", "live-email-key"], ["STRIPE_SECRET_KEY", "sk_live_test"],
    ["AWS_ROLE_ARN", "arn:aws:iam::123456789012:role/live-viewer"],
    ["SCANNEX_VIEWER_LAB_ENABLED", "true"], ["ALP_EMAIL_MODE", "enabled"]
  ])("blocks unsafe %s before a server can start", (key, value) => {
    expect(() => assertStagingIsolation({ ...stage, [key]: value })).toThrow("V2_ISOLATION_BLOCKED");
  });
  it("rejects a production JWT key even when the URL has been corrected", () => {
    const jwt = `eyJ.${Buffer.from(JSON.stringify({ ref: "ooujszdvncwijbuzpjfp" })).toString("base64url")}.signature`;
    expect(() => assertStagingIsolation({ ...stage, SUPABASE_SERVICE_ROLE_KEY: jwt })).toThrow("V2_ISOLATION_BLOCKED");
  });
  it('permits expressly scoped transactional mail while keeping all other live services blocked',()=>{
    const enabled={...stage,ALP_EMAIL_MODE:'transactional',STAGING_EMAIL_SCOPE:'apgi-v2-invitations',STAGING_RESEND_API_KEY:'re_dedicated_fixture',STAGING_EMAIL_FROM:'APGI V2 <no_reply@apginc.ca>'};
    expect(()=>assertStagingIsolation(enabled)).not.toThrow();
    for(const change of [{STAGING_EMAIL_SCOPE:''},{STAGING_RESEND_API_KEY:''},{STAGING_EMAIL_FROM:'someone@example.com'},{RESEND_API_KEY:'inherited-live-key'},{AWS_ROLE_ARN:'live'},{ALP_PAYMENTS_MODE:'enabled'}])expect(()=>assertStagingIsolation({...enabled,...change})).toThrow('V2_ISOLATION_BLOCKED');
  });
  it("does not send invitations, confirmation or recovery emails, even with accidentally inherited keys", async () => {
    vi.stubEnv("ALP_ENVIRONMENT", "v2-staging"); vi.stubEnv("RESEND_API_KEY", "accidental-key");
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    await sendCourseInvitationEmail({ invitationId: "test", recipientEmail: "learner@example.invalid", courseTitle: "Test", invitationToken: "test", expiresAt: "2099-01-01" });
    expect(await sendAccountConfirmationEmail("learner@example.invalid", "test")).toBe(true);
    expect(await sendPasswordRecoveryEmail("learner@example.invalid", "test", "/profile")).toBe(true);
    expect(network).not.toHaveBeenCalled();
  });
  it("does not configure a Viewer session when live settings are accidentally inherited", () => {
    expect(getViewerLabConfig({ ...stage, SCANNEX_VIEWER_LAB_ENABLED: "true", AWS_ROLE_ARN: "live", SCANNEX_VIEWER_LAB_FLEET_NAME: "live", SCANNEX_VIEWER_LAB_STACK_NAME: "live", SCANNEX_VIEWER_LAB_APPLICATION_ID: "live", SCANNEX_VIEWER_LAB_REGION: "eu-west-1" })).toBeNull();
  });
});
