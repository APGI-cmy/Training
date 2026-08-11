import { describe, expect, it } from "vitest";
import { expectContains, expectPath, read } from "./helpers/project-root";

const learnerService = "src/lib/services/admin/get-admin-learners.ts";
const learnerPage = "app/(admin)/admin/learners/page.tsx";
const invitationDraft = "src/components/admin/InvitationDraftForm.tsx";
const importWorkspace = "src/components/admin/LearnerImportWorkspace.tsx";
const fullPagePreview = "app/admin/courses/[courseSlug]/preview/[unitSlug]/full/page.tsx";

describe("ALP W4.2 learner management experience", () => {
  it("QA-ALP-LMX-001 provides an admin-gated, bounded learner read model", () => {
    expectPath(learnerService, "QA-ALP-LMX-001");
    for (const marker of ["requireAdmin", "range", "pageSize", "profiles", "course_enrolments"]) {
      expectContains(learnerService, marker, "QA-ALP-LMX-001");
    }
  });

  it("QA-ALP-LMX-002 provides a discoverable learner directory without opaque-ID entry", () => {
    expectPath(learnerPage, "QA-ALP-LMX-002");
    for (const marker of ["Search learners", "Manage enrolments", "page", "Learners"]) {
      expectContains(learnerPage, marker, "QA-ALP-LMX-002");
    }
    expect(read(learnerPage)).not.toContain('name="userId"');
  });

  it("QA-ALP-LMX-003 keeps invitation preparation as a non-mutating draft", () => {
    expectPath(invitationDraft, "QA-ALP-LMX-003");
    const source = read(invitationDraft);
    expect(source).toContain("Review invitation draft");
    expect(source).toContain("created_not_sent");
    expect(source).not.toContain("createInvitation");
    expect(source).not.toContain("useActionState");
  });

  it("QA-ALP-LMX-004 stages local imports but never executes them", () => {
    expectPath(importWorkspace, "QA-ALP-LMX-004");
    const source = read(importWorkspace);
    for (const marker of ["Download CSV template", "Choose CSV file", "Review import draft", "Import execution is disabled"]) {
      expect(source).toContain(marker);
    }
    expect(source).not.toContain("createBatchInvitations");
    expect(source).not.toContain("fetch(");
  });

  it("QA-ALP-LMX-005 adds an admin-only full-page preview without progress mutation", () => {
    expectPath(fullPagePreview, "QA-ALP-LMX-005");
    const source = read(fullPagePreview);
    expect(source).toContain("requireAdmin");
    expect(source).toContain("encodeAssetPath");
    expect(source).not.toContain("recordProgressEvent");
    expect(source).not.toContain("course_enrolments");
  });

  it("QA-ALP-LMX-006 exposes the learner workspace in the role-aware admin navigation", () => {
    expectContains("src/components/navigation/LearnerSidebar.tsx", "/admin/learners", "QA-ALP-LMX-006");
  });
});
