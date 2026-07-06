import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP W4.1 enrolment state and course access gating", () => {
  it("QA-ALP-241 enrolment schema and audit events exist", () => {
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "course_enrolments", "QA-ALP-241");
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "course_enrolment_events", "QA-ALP-241");
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "status in ('pending', 'enrolled', 'revoked')", "QA-ALP-241");
  });

  it("QA-ALP-242 enrolment RLS policies exist", () => {
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "alter table public.course_enrolments enable row level security", "QA-ALP-242");
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "course_enrolments_select_self_or_admin", "QA-ALP-242");
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "course_enrolments_admin_write", "QA-ALP-242");
  });

  it("QA-ALP-243 course access service exists", () => {
    expectPath("src/lib/services/enrolments/get-course-access.ts", "QA-ALP-243");
    expectContains("src/lib/services/enrolments/get-course-access.ts", "canAccess", "QA-ALP-243");
    expectContains("src/lib/services/enrolments/get-course-access.ts", "not_enrolled", "QA-ALP-243");
  });

  it("QA-ALP-244 course shell and unit viewer are gated by enrolment access", () => {
    expectContains("app/(learner)/learn/[courseSlug]/page.tsx", "getCourseAccess", "QA-ALP-244");
    expectContains("app/(learner)/learn/[courseSlug]/page.tsx", "CourseAccessDenied", "QA-ALP-244");
    expectContains("app/(learner)/learn/[courseSlug]/units/[unitSlug]/page.tsx", "getCourseAccess", "QA-ALP-244");
    expectContains("app/(learner)/learn/[courseSlug]/units/[unitSlug]/page.tsx", "CourseAccessDenied", "QA-ALP-244");
  });
});
