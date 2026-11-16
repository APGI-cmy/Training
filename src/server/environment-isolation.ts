// V2 is a staging-only development line. Changing these boundaries requires a
// separately reviewed release; never relax them to deploy to the V1 project.
export const STAGING_PROJECT_ID = "prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf";
export const STAGING_DATABASE_REF = "eaaqgtdpvbxdgjxphjie";
export const STAGING_ORIGIN = "https://training-platform-v2-staging.vercel.app";
export const LIVE_DATABASE_REF = "ooujszdvncwijbuzpjfp";
export const STAGING_EMAIL_SCOPE = "apgi-v2-invitations";

type Environment = Record<string, string | undefined>;

export function stagingEmailEnabled(env: Environment = process.env) {
  return env.ALP_ENVIRONMENT === "v2-staging" && env.ALP_EMAIL_MODE === "transactional"
    && env.STAGING_EMAIL_SCOPE === STAGING_EMAIL_SCOPE;
}

export function usesStagingMailCapture(env: Environment = process.env) {
  return env.ALP_ENVIRONMENT === "v2-staging" && !stagingEmailEnabled(env);
}

export function assertStagingIsolation(env: Environment = process.env) {
  const fail = (reason: string): never => { throw new Error(`V2_ISOLATION_BLOCKED: ${reason}`); };
  if (env.ALP_ENVIRONMENT !== "v2-staging") fail("staging environment must be explicitly selected");
  if (env.VERCEL && env.VERCEL_PROJECT_ID !== STAGING_PROJECT_ID) fail("wrong hosting project");
  const expectedUrl = `https://${STAGING_DATABASE_REF}.supabase.co`;
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]) {
    const value = env[key];
    if (key === "SUPABASE_URL" && !value) continue;
    if (value?.replace(/\/$/, "") !== expectedUrl) fail("wrong database endpoint");
  }
  if (env.ALP_STAGING_DATABASE_REF !== STAGING_DATABASE_REF) fail("wrong database identity");
  for (const key of ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    const value = env[key];
    if (!value) fail("isolated database credentials are required");
    // Legacy JWT keys encode the project ref. Opaque keys are checked by the
    // isolated provider endpoint; their values must never be written to logs.
    if (value?.startsWith("eyJ")) {
      try {
        const claims = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString());
        if (claims.ref !== STAGING_DATABASE_REF) fail("wrong credential project");
      } catch { fail("invalid isolated database credential"); }
    }
  }
  if (env.SUPABASE_SECRET_KEY || env.SUPABASE_JWT_SECRET) fail("unapproved alternate database credential");
  let origin: URL;
  try { origin = new URL(env.NEXT_PUBLIC_APP_URL ?? ""); } catch { return fail("invalid application address"); }
  const local = env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(origin.hostname);
  if (origin.origin !== STAGING_ORIGIN && !local) fail("wrong application address");
  if (!["disabled", "transactional"].includes(env.ALP_EMAIL_MODE ?? "")) fail("unapproved email delivery mode");
  if (env.ALP_EMAIL_MODE === "transactional") {
    if (!stagingEmailEnabled(env)) fail("explicit staging email scope is required");
    if (!env.STAGING_RESEND_API_KEY?.startsWith("re_")) fail("dedicated staging email credential is required");
    if (!/^(?:[^<>\r\n]+\s*<)?[^\s<>@]+@apginc\.ca>?$/i.test(env.STAGING_EMAIL_FROM ?? "")) fail("verified staging sender is required");
  }
  if (env.ALP_PAYMENTS_MODE !== "disabled") fail("payments must be disabled");
  if (env.SCANNEX_VIEWER_LAB_ENABLED !== "false") fail("Viewer streaming must be disabled");
  for (const key of ["RESEND_API_KEY", "EMAIL_FROM", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "AIMC_GATEWAY_API_KEY", "AIMC_GATEWAY_URL",
    "AWS_ROLE_ARN", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
    "SCANNEX_VIEWER_LAB_FLEET_NAME", "SCANNEX_VIEWER_LAB_STACK_NAME"]) {
    if (env[key]?.trim()) fail(`integration must remain disconnected (${key})`);
  }
}
