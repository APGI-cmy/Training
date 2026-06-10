import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP Stage 6 assessment submission", () => {
  it("QA-ALP-291 assessment admin route and schema exist", () => {
    expectPath("app/(admin)/admin/assessments/page.tsx", "QA-ALP-291");
    expectContains("supabase/migrations/005_alp_assessment_ai_review.sql", "assessments", "QA-ALP-291");
  });

  it("QA-ALP-296 assessment submission action exists", () => {
    expectPath("server/actions/assessments/submit-assessment.ts", "QA-ALP-296");
    expectContains("supabase/migrations/005_alp_assessment_ai_review.sql", "assessment_submissions", "QA-ALP-296");
  });

  it("QA-ALP-297 evidence upload action exists", () => {
    expectPath("server/actions/files/upload-assessment-file.ts", "QA-ALP-297");
    expectContains("supabase/migrations/005_alp_assessment_ai_review.sql", "assessment_files", "QA-ALP-297");
  });

  it("QA-ALP-341 AI evaluation action uses AIMC", () => {
    expectPath("server/actions/ai/evaluate-assessment-via-aimc.ts", "QA-ALP-341");
    expectContains("server/actions/ai/evaluate-assessment-via-aimc.ts", "AIMC_GATEWAY", "QA-ALP-341");
  });

  it("QA-ALP-381 review queue exists", () => {
    expectPath("app/(admin)/admin/reviews/page.tsx", "QA-ALP-381");
    expectPath("server/actions/reviews/review-assessment.ts", "QA-ALP-381");
  });
});
