import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP Stage 6 course shell and unit viewer", () => {
  it("QA-ALP-211 course shell route and service exist", () => {
    expectPath("app/(learner)/learn/[courseSlug]/page.tsx", "QA-ALP-211");
    expectPath("lib/services/courses/get-course-shell.ts", "QA-ALP-211");
  });

  it("QA-ALP-213 sidebar and course hierarchy schema exist", () => {
    expectPath("components/course/course-sidebar.tsx", "QA-ALP-213");
    expectContains("supabase/migrations/002_alp_courses_content.sql", "course_modules", "QA-ALP-213");
    expectContains("supabase/migrations/002_alp_courses_content.sql", "learning_units", "QA-ALP-213");
  });

  it("QA-ALP-217 unit viewer and content links exist", () => {
    expectPath("components/course/unit-viewer.tsx", "QA-ALP-217");
    expectContains("supabase/migrations/002_alp_courses_content.sql", "content_links", "QA-ALP-217");
  });

  it("QA-ALP-222 unit launch can record progress", () => {
    expectPath("server/actions/progress/record-progress-event.ts", "QA-ALP-222");
  });
});
