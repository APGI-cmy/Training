import { describe, it } from "vitest";
import { expectAnyPath, expectContains, expectPath } from "./helpers/project-root";

const routes = [
  ["QA-ALP-021", "app/(public)/login/page.tsx"],
  ["QA-ALP-022", "app/(public)/invite/[token]/page.tsx"],
  ["QA-ALP-023", "app/(public)/courses/[courseSlug]/buy/page.tsx"],
  ["QA-ALP-024", "app/(public)/checkout/status/page.tsx"],
  ["QA-ALP-025", "app/(learner)/dashboard/page.tsx"],
  ["QA-ALP-026", "app/(learner)/profile/page.tsx"],
  ["QA-ALP-027", "app/(learner)/learn/[courseSlug]/page.tsx"],
  ["QA-ALP-028", "app/(learner)/learn/[courseSlug]/units/[unitSlug]/page.tsx"],
  ["QA-ALP-029", "app/(learner)/learn/[courseSlug]/assessments/page.tsx"],
  ["QA-ALP-030", "app/(learner)/learn/[courseSlug]/assessments/[assessmentId]/page.tsx"],
  ["QA-ALP-031", "app/(learner)/certificates/page.tsx"],
  ["QA-ALP-032", "app/(learner)/certificates/[certificateId]/page.tsx"],
  ["QA-ALP-033", "app/(admin)/admin/page.tsx"],
  ["QA-ALP-034", "app/(admin)/admin/learners/page.tsx"],
  ["QA-ALP-035", "app/(admin)/admin/enrolments/page.tsx"],
  ["QA-ALP-036", "app/(admin)/admin/courses/page.tsx"],
  ["QA-ALP-037", "app/(admin)/admin/assessments/page.tsx"],
  ["QA-ALP-038", "app/(admin)/admin/reviews/page.tsx"],
  ["QA-ALP-039", "app/(admin)/admin/payments/page.tsx"],
  ["QA-ALP-040", "app/(admin)/admin/certificates/page.tsx"],
  ["QA-ALP-041", "app/(admin)/admin/reports/page.tsx"],
  ["QA-ALP-042", "app/(admin)/admin/audit/page.tsx"],
  ["QA-ALP-044", "app/not-found.tsx"],
  ["QA-ALP-045", "app/error.tsx"]
];

const components = [
  "components/layout/app-shell.tsx",
  "components/auth/protected-layout.tsx",
  "components/auth/login-form.tsx",
  "components/dashboard/learner-dashboard.tsx",
  "components/course/course-shell.tsx",
  "components/course/course-sidebar.tsx",
  "components/course/unit-viewer.tsx",
  "components/progress/progress-indicator.tsx",
  "components/assessments/assessment-submission-form.tsx",
  "components/reviews/review-queue.tsx",
  "components/certificates/certificate-viewer.tsx",
  "components/admin/admin-table.tsx",
  "components/audit/audit-log-table.tsx"
];

const actions = [
  "server/actions/invitations/accept-invitation.ts",
  "server/actions/payments/create-checkout-session.ts",
  "app/api/webhooks/stripe/route.ts",
  "server/actions/enrolments/manual-enrolment.ts",
  "server/actions/profiles/update-profile.ts",
  "server/actions/progress/record-progress-event.ts",
  "server/actions/assessments/submit-assessment.ts",
  "server/actions/ai/evaluate-assessment-via-aimc.ts",
  "server/actions/reviews/review-assessment.ts",
  "server/actions/certificates/generate-certificate.ts",
  "lib/services/audit/write-audit-log.ts"
];

describe("ALP Stage 6 architecture inventory", () => {
  for (const [qaId, path] of routes) {
    it(`${qaId} route exists: ${path}`, () => expectPath(path, qaId));
  }

  it("QA-ALP-043 unauthorized route exists", () => {
    expectAnyPath(["app/unauthorized.tsx", "app/(public)/unauthorized/page.tsx"], "QA-ALP-043");
  });

  for (const path of components) {
    it(`component exists: ${path}`, () => expectPath(path, `COMP-${path}`));
  }

  for (const path of actions) {
    it(`server action or API exists: ${path}`, () => expectPath(path, `ACTION-${path}`));
  }

  it("QA-ALP-057 migration set exists", () => {
    expectPath("supabase/migrations/001_alp_auth_profile.sql", "QA-ALP-057");
    expectPath("supabase/migrations/007_alp_rls_policies.sql", "QA-ALP-057");
  });

  it("QA-ALP-058 .env.example exists and contains core variables", () => {
    expectPath(".env.example", "QA-ALP-058");
    expectContains(".env.example", "NEXT_PUBLIC_SUPABASE_URL", "QA-ALP-059");
    expectContains(".env.example", "STRIPE_SECRET_KEY", "QA-ALP-060");
    expectContains(".env.example", "AIMC_GATEWAY_URL", "QA-ALP-061");
  });
});
