import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP Stage 6 deployment and CWT evidence", () => {
  it("QA-ALP-636 package build script exists", () => {
    expectContains("package.json", "\"build\": \"next build\"", "QA-ALP-636");
  });

  it("QA-ALP-637 package typecheck script exists", () => {
    expectContains("package.json", "\"typecheck\": \"tsc --noEmit\"", "QA-ALP-637");
  });

  it("QA-ALP-642 environment validation module exists", () => {
    expectPath("src/lib/config/env.ts", "QA-ALP-642");
  });

  it("QA-ALP-643 Stripe webhook route exists", () => {
    expectPath("app/api/webhooks/stripe/route.ts", "QA-ALP-643");
  });

  it("QA-ALP-657 CWT closure report exists", () => {
    expectPath("architecture/builds/ALP_BUILD_001_DRAFT/CWT_CLOSURE_REPORT.md", "QA-ALP-657");
  });

  it("QA-ALP-660 fully functional proof exists before handover", () => {
    expectContains("architecture/builds/ALP_BUILD_001_DRAFT/CWT_CLOSURE_REPORT.md", "Fully Functional", "QA-ALP-660");
  });
});
