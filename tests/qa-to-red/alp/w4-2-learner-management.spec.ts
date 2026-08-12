import { describe, expect, it } from "vitest";
import { expectContains, expectPath, read } from "./helpers/project-root";

const learnerService = "src/lib/services/admin/get-admin-learners.ts";
const learnerPage = "app/(admin)/admin/learners/page.tsx";
const enrolmentPage = "app/(admin)/admin/enrolments/page.tsx";
const enrolmentWorkspace = "src/components/admin/EnrolmentManagementWorkspace.tsx";
const invitationDraft = "src/components/admin/InvitationDraftForm.tsx";
const importWorkspace = "src/components/admin/LearnerImportWorkspace.tsx";
const fullPagePreview = "app/admin/courses/[courseSlug]/preview/[unitSlug]/full/page.tsx";
const presentationOnlyPreview = "app/admin/courses/[courseSlug]/preview/[unitSlug]/presentation/page.tsx";

describe("ALP W4.2 learner management experience", () => {
  it("QA-ALP-LMX-001 provides an admin-gated, bounded learner read model", () => {
    expectPath(learnerService, "QA-ALP-LMX-001");
    for (const marker of ["requireAdmin", "range", "pageSize", "profiles", "course_enrolments"]) expectContains(learnerService, marker, "QA-ALP-LMX-001");
  });
  it("QA-ALP-LMX-002 provides a discoverable learner directory without opaque-ID entry", () => {
    expectPath(learnerPage, "QA-ALP-LMX-002");
    for (const marker of ["Search learners", "Manage enrolments", "page", "Learners"]) expectContains(learnerPage, marker, "QA-ALP-LMX-002");
    expect(read(learnerPage)).not.toContain('name="userId"');
  });
  it("QA-ALP-LMX-003 keeps invitation preparation as a non-mutating, future-expiry draft", () => {
    expectPath(invitationDraft, "QA-ALP-LMX-003");
    const source = read(invitationDraft);
    for (const marker of ["Review invitation draft", "created_not_sent", "expiry.getTime() <= Date.now()"] ) expect(source).toContain(marker);
    expect(source).not.toContain("createInvitation");
    expect(source).not.toContain("useActionState");
  });
  it("QA-ALP-LMX-004 stages CSV or Excel imports locally, prepares a visible draft, and never executes them", () => {
    expectPath(importWorkspace, "QA-ALP-LMX-004");
    const source = read(importWorkspace);
    for (const marker of ["Download CSV template", "Choose spreadsheet", "parseWorkbookRows", ".xlsx", "company,country,operation_subdivision,department_team", "requiredReportingHeaders", "missingRequiredReportingHeaders.length === 0", "Import draft prepared", "Import execution is disabled", "setTimeout(() => URL.revokeObjectURL(url)"]) expect(source).toContain(marker);
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
  it("QA-ALP-LMX-009 adds an admin-gated presentation-only preview without portal chrome or progress mutation", () => {
    expectPath(presentationOnlyPreview, "QA-ALP-LMX-009");
    const source = read(presentationOnlyPreview);
    for (const marker of ["requireAdmin", "PresentationOnlyMode", "encodeAssetPath", "allowFullScreen"]) expect(source).toContain(marker);
    expect(source).not.toContain("recordProgressEvent");
    expect(source).not.toContain("course_enrolments");
    expect(read(fullPagePreview)).toContain("Open presentation only");
  });
  it("QA-ALP-LMX-006 exposes the learner workspace in the role-aware admin navigation", () => expectContains("src/components/navigation/LearnerSidebar.tsx", "/admin/learners", "QA-ALP-LMX-006"));
  it("QA-ALP-LMX-007 keeps learner PII out of management URLs and resolves server context", () => {
    expect(read(learnerPage)).not.toContain("&learner=");
    expect(read(learnerPage)).not.toContain("&email=");
    expect(read(enrolmentPage)).toContain("getAdminLearner(params.learnerId)");
    expect(read(enrolmentWorkspace)).toContain("Review draft prepared");
  });
  it("QA-ALP-LMX-008 treats directory wildcard input as literal text", () => expect(read(learnerService)).toContain("/[\\\\%_]/g"));
});
