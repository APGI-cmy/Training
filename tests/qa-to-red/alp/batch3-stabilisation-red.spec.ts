import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  const absolutePath = join(process.cwd(), path);

  expect(
    existsSync(absolutePath),
    `Required Batch 3 capability file is missing: ${path}`
  ).toBe(true);

  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

describe("ALP Batch 3 stabilisation QA-to-Red", () => {
  it("uses one role-aware destination resolver for root, sign-in and brand navigation", () => {
    const root = source("app/page.tsx");
    const signIn = source("app/alp-sign-in/actions.ts");
    const layout = source("app/layout.tsx");

    expect(root).toContain("getPortalEntryDestination");
    expect(signIn).toContain("getPortalEntryDestination");
    expect(layout).not.toContain('href="/courses/vpshr-level-0"');
  });

  it("places administration destinations in the persistent sidebar model", () => {
    const sidebar = source("src/components/navigation/LearnerSidebar.tsx");
    const adminLayout = source("app/admin/layout.tsx");

    expect(sidebar).toContain("/admin/invitations");
    expect(sidebar).toContain("/admin/enrolments");
    expect(sidebar).toContain("/admin/courses");
    expect(adminLayout).toContain("LearnerSidebar");
  });

  it("filters dashboard cards and totals to enrolled courses", () => {
    const dashboard = source("src/lib/services/dashboard/get-dashboard.ts");

    expect(dashboard).toContain("getCourseAccess");
    expect(dashboard).toMatch(/status\s*===\s*["']enrolled["']/);
    expect(dashboard).not.toContain("courses.push({");
  });

  it("models My Learning independently from the complete catalogue", () => {
    const catalogue = source("app/(learner)/catalogue/page.tsx");

    expect(catalogue).toContain("getMyLearningEntries");
    expect(catalogue).toContain("getCatalogueEntries");
  });

  it("renders VPSHR and Scannex through a shared course overview", () => {
    const vpshr = source("app/courses/vpshr-level-0/page.tsx");
    const scannex = source("app/courses/scannex-training-programme/page.tsx");

    expect(vpshr).toContain("CourseOverview");
    expect(scannex).toContain("CourseOverview");
  });

  it("does not expose raw protected unit assets from public course pages", () => {
    const scannex = source("app/courses/scannex-training-programme/page.tsx");
    const vpshr = source("src/components/LearningUnitCard.tsx");

    expect(scannex).not.toContain("unit.publishedPath");
    expect(vpshr).not.toContain("Open gated unit");
  });

  it("uses course-specific access recovery links", () => {
    const denied = source("src/components/course/CourseAccessDenied.tsx");

    expect(denied).toContain("`/courses/${course.slug}`");
    expect(denied).not.toContain('href="/courses/vpshr-level-0"');
  });

  it("provides a role-gated admin course preview without enrolment mutation", () => {
    const preview = source("app/admin/courses/[courseSlug]/preview/page.tsx");

    expect(preview).toContain("requireAdmin");
    expect(preview).toContain("preview");
    expect(preview).not.toContain("course_enrolments");
    expect(preview).not.toContain("markUnitComplete");
  });

  it("resolves VPSHR learning assets with the shared safe path encoder", () => {
    const courseShell = source("src/lib/services/courses/get-course-shell.ts");

    expect(courseShell).toContain("encodeAssetPath");
    expect(courseShell).not.toContain("vpshr-level-0/index.html");
  });

  it("does not claim invitation delivery without an approved provider result", () => {
    const action = source("src/server/actions/invitations/create-invitation.ts");
    const form = source("src/components/admin/InvitationForm.tsx");

    expect(action).toContain("deliveryStatus");
    expect(action).not.toContain('event_type: "sent"');
    expect(form).toContain("created_not_sent");
  });
});
