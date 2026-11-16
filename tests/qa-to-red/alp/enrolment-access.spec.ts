import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP W4.1 enrolment state and course access gating", () => {
  it("QA-ALP-241 enrolment schema and audit events exist", () => {
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "course_enrolments", "QA-ALP-241");
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "course_enrolment_events", "QA-ALP-241");
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "status in ('pending', 'enrolled', 'revoked')", "QA-ALP-241");
  });

  it("QA-ALP-242 enrolment read-gating RLS policies exist", () => {
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "alter table public.course_enrolments enable row level security", "QA-ALP-242");
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "course_enrolments_select_self_or_admin", "QA-ALP-242");
    expectContains("supabase/migrations/005_alp_enrolments_access.sql", "No public enrolment insert/update policies", "QA-ALP-242");
  });

  it("QA-ALP-243 course access service exists", () => {
    expectPath("src/lib/services/enrolments/get-course-access.ts", "QA-ALP-243");
    expectContains("src/lib/services/enrolments/get-course-access.ts", "canAccess", "QA-ALP-243");
    expectContains("src/lib/services/enrolments/get-course-access.ts", "not_enrolled", "QA-ALP-243");
    expectContains("src/lib/services/enrolments/get-course-access.ts", "unknownAccessDecision", "QA-ALP-243");
  });

  it("QA-ALP-244 course shell and unit viewer are gated by enrolment access", () => {
    expectContains("app/(learner)/learn/[courseSlug]/page.tsx", "getCourseAccess", "QA-ALP-244");
    expectContains("app/(learner)/learn/[courseSlug]/page.tsx", "CourseAccessDenied", "QA-ALP-244");
    expectContains("app/(learner)/learn/[courseSlug]/units/[unitSlug]/page.tsx", "getCourseAccess", "QA-ALP-244");
    expectContains("app/(learner)/learn/[courseSlug]/units/[unitSlug]/page.tsx", "CourseAccessDenied", "QA-ALP-244");
  });

  it("QA-ALP-245 denied state does not link to ungated legacy course overview", () => {
    expectPath("src/components/course/CourseAccessDenied.tsx", "QA-ALP-245");
    expectContains("src/components/course/CourseAccessDenied.tsx", "deniedHeading", "QA-ALP-245");
    expectContains("src/components/course/CourseAccessDenied.tsx", "Return to dashboard", "QA-ALP-245");
  });

  it("QA-ALP-247 public course links clarify and use governed learner routes", () => {
    expectContains("app/courses/vpshr-level-0/page.tsx", "/learn/{course.slug}", "QA-ALP-247");
    expectContains("app/courses/vpshr-level-0/page.tsx", "governed learner route", "QA-ALP-247");
    expectContains("src/components/LearningUnitCard.tsx", "/learn/vpshr-level-0/units/", "QA-ALP-247");
  });
});
