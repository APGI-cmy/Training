import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP Stage 6 auth and route protection", () => {
  it("QA-ALP-066 login form exists", () => {
    expectPath("app/alp-sign-in/page.tsx", "QA-ALP-066");
    expectPath("src/components/auth/login-form.tsx", "QA-ALP-066");
  });

  it("QA-ALP-071 admin route is protected", () => {
    expectPath("src/components/auth/protected-layout.tsx", "QA-ALP-071");
    expectContains("src/components/auth/protected-layout.tsx", "admin", "QA-ALP-071");
  });

  it("QA-ALP-077 user roles are schema-backed", () => {
    expectContains("supabase/migrations/001_alp_auth_profile.sql", "user_roles", "QA-ALP-077");
  });

  it("QA-ALP-080 server-only secrets are not client-facing", () => {
    expectContains(".env.example", "SUPABASE_SERVICE_ROLE_KEY", "QA-ALP-080");
  });

  it("QA-ALP-246 visible sign out control exists and resets to ALP sign in", () => {
    expectPath("src/components/auth/sign-out-control.tsx", "QA-ALP-246");
    expectContains("src/components/auth/sign-out-control.tsx", "Sign out", "QA-ALP-246");
    expectContains("src/server/actions/auth/sign-in.ts", "redirect(\"/alp-sign-in\")", "QA-ALP-246");
    expectContains("app/layout.tsx", "SignOutControl", "QA-ALP-246");
  });
});
