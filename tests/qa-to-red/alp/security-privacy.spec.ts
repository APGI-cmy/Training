import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP Stage 6 security privacy and RLS", () => {
  it("QA-ALP-526 RLS migration exists", () => {
    expectPath("supabase/migrations/007_alp_rls_policies.sql", "QA-ALP-526");
  });

  it("QA-ALP-527 profile RLS uses auth.uid", () => {
    expectContains("supabase/migrations/007_alp_rls_policies.sql", "profiles", "QA-ALP-527");
    expectContains("supabase/migrations/007_alp_rls_policies.sql", "auth.uid()", "QA-ALP-527");
  });

  it("QA-ALP-535 Stripe webhook uses signing secret", () => {
    expectContains("app/api/webhooks/stripe/route.ts", "STRIPE_WEBHOOK_SECRET", "QA-ALP-535");
  });

  it("QA-ALP-538 private storage is configured", () => {
    expectContains(".env.example", "PRIVATE_FILE_BUCKET", "QA-ALP-538");
  });
});
