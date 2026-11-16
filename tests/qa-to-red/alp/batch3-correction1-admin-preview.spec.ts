import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  const absolutePath = join(process.cwd(), path);
  expect(existsSync(absolutePath), `Required Correction 1 file is missing: ${path}`).toBe(true);
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

describe("ALP Batch 3 Correction 1 — administrator preview containment", () => {
  it("keeps each administrator unit preview inside a role-gated portal route", () => {
    const overview = source("app/admin/courses/[courseSlug]/preview/page.tsx");
    const unitPreview = source("app/admin/courses/[courseSlug]/preview/[unitSlug]/page.tsx");

    const access = source("src/server/services/course-preview.ts");
    expect(overview).toContain("PreviewCourseHome");
    expect(access).toContain("requireAdmin()");
    expect(access).toContain("/admin/courses/${shell.course.slug}/preview");
    expect(overview).not.toContain('href={unit.assetHref}');
    expect(unitPreview).toContain("requireAdmin");
    expect(unitPreview).toContain("getUnitContent");
    expect(unitPreview).not.toContain("recordProgressEvent");
    expect(unitPreview).not.toContain("course_enrolments");
  });

  it("uses the shared authenticated page treatment for invitation and enrolment administration", () => {
    const invitations = source("app/(admin)/admin/invitations/page.tsx");
    const enrolments = source("app/(admin)/admin/enrolments/page.tsx");

    expect(invitations).toContain('className="page-shell"');
    expect(invitations).toContain('className="page-header"');
    expect(enrolments).toContain('className="page-shell"');
    expect(enrolments).toContain('className="page-header"');
  });
});
