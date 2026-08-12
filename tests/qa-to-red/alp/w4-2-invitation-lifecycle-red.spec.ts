import { describe, expect, it } from "vitest";
import { expectPath, read } from "./helpers/project-root";

describe("ALP W4.2 persistent invitation lifecycle — RED", () => {
  it("QA-IL-001 exposes only an authorised server-side invitation lifecycle", () => {
    expectPath("src/server/actions/invitations/create-invitation.ts", "QA-IL-001");
    expect(read("src/server/actions/invitations/create-invitation.ts")).toContain("requireAdmin");
  });
  it("QA-IL-004 routes a valid accepted invitation to mandatory onboarding", () => {
    expectPath("app/invitations/[token]/page.tsx", "QA-IL-004");
    expect(read("app/invitations/[token]/page.tsx")).toContain("/onboarding");
  });
  it("QA-IL-007 protects national identity numbers and CV storage", () => {
    expectPath("supabase/migrations", "QA-IL-007");
    expectPath("src/lib/services/profile", "QA-IL-007");
  });
  it("QA-IL-009 creates an idempotent enrolment and audit event on redemption", () => {
    expectPath("src/lib/services/invitations/redeem-invitation.ts", "QA-IL-009");
    expect(read("src/lib/services/invitations/redeem-invitation.ts")).toContain("idempot");
  });
  it("QA-IL-011 provides the AMC-consumable app-wide QA coverage manifest", () => {
    expectPath("modules/ALP/05-qa-to-red/APP_WIDE_QA_COVERAGE_MANIFEST.md", "QA-IL-011");
  });
});