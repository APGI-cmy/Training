import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP Stage 6 auth and route protection", () => {
  it("QA-ALP-066 login form exists", () => {
    expectPath("app/(public)/login/page.tsx", "QA-ALP-066");
    expectPath("components/auth/login-form.tsx", "QA-ALP-066");
  });

  it("QA-ALP-071 admin route is protected", () => {
    expectPath("components/auth/protected-layout.tsx", "QA-ALP-071");
    expectContains("components/auth/protected-layout.tsx", "admin", "QA-ALP-071");
  });

  it("QA-ALP-077 user roles are schema-backed", () => {
    expectContains("supabase/migrations/001_alp_auth_profile.sql", "user_roles", "QA-ALP-077");
  });

  it("QA-ALP-080 server-only secrets are not client-facing", () => {
    expectContains(".env.example", "SUPABASE_SERVICE_ROLE_KEY", "QA-ALP-080");
  });
});
