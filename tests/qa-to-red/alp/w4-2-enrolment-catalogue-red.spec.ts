import { describe, expect, it } from "vitest";
import { expectContains, expectPath, read } from "./helpers/project-root";

const invitationMigration = "supabase/migrations/010_alp_admin_invitations.sql";
const createInvitationAction = "src/server/actions/invitations/create-invitation.ts";
const acceptInvitationAction = "src/server/actions/invitations/accept-invitation.ts";
const changeEnrolmentAction = "src/server/actions/enrolments/change-enrolment-status.ts";

describe("ALP W4.2 executable QA-to-Red", () => {
  it("QA-ALP-252 sidebar uses generic learner navigation", () => {
    expectContains("src/components/navigation/LearnerSidebar.tsx", "My learning", "QA-ALP-252");
    expectContains("src/components/navigation/LearnerSidebar.tsx", "Course catalogue", "QA-ALP-252");
    expectContains("src/components/navigation/LearnerSidebar.tsx", "Administration", "QA-ALP-252");
    expect(read("src/components/navigation/LearnerSidebar.tsx").includes("vpshr-level-0"), "QA-ALP-252: sidebar must not hard-code one course").toBe(false);
  });

  it("QA-ALP-253 catalogue source contains at least two published courses", () => {
    const source = read("src/lib/courses.ts");
    expect(source.includes("const courses = [vpshrLevel0 as Course]"), "QA-ALP-253: single-course source remains").toBe(false);
    expect(source.toLowerCase().includes("scannex"), "QA-ALP-253: second published course is not registered").toBe(true);
    expectPath("app/courses/scannex-training-programme/page.tsx", "QA-ALP-253");
  });

  it("QA-ALP-254 signed-in catalogue presents learner-specific states and actions", () => {
    expectPath("app/(learner)/catalogue/page.tsx", "QA-ALP-254");
    for (const marker of ["Enrolled", "Pending", "Not enrolled", "Revoked", "Continue course", "Enrol now"]) {
      expectContains("app/(learner)/catalogue/page.tsx", marker, "QA-ALP-254");
    }
  });

  it("QA-ALP-255 administration is role-gated", () => {
    expectPath("app/(admin)/admin/layout.tsx", "QA-ALP-255");
    expectPath("src/lib/auth/require-admin.ts", "QA-ALP-255");
    expectContains("app/(admin)/admin/layout.tsx", "requireAdmin", "QA-ALP-255");
  });

  it("QA-ALP-256 legacy routes have an inventory and redirect matrix", () => {
    expectPath("modules/ALP/11-build/evidence/w4-2-legacy-route-redirect-matrix.md", "QA-ALP-256");
    expectContains("modules/ALP/11-build/evidence/w4-2-legacy-route-redirect-matrix.md", "Retain or redirect", "QA-ALP-256");
  });

  it("QA-ALP-257 authorized admin can create a course invitation", () => {
    expectPath("app/(admin)/admin/invitations/page.tsx", "QA-ALP-257");
    expectPath(createInvitationAction, "QA-ALP-257");
    for (const marker of ["recipientEmail", "courseId", "basis", "reason", "expiresAt"]) {
      expectContains(createInvitationAction, marker, "QA-ALP-257");
    }
  });

  it("QA-ALP-258 complimentary and external-payment invitations require a reason", () => {
    expectPath(createInvitationAction, "QA-ALP-258");
    expectContains(createInvitationAction, "INVITATION_REASON_REQUIRED", "QA-ALP-258");
    expectContains(createInvitationAction, "reason.trim()", "QA-ALP-258");
  });

  it("QA-ALP-259 invitation secrets are protected", () => {
    expectPath(invitationMigration, "QA-ALP-259");
    expectContains(invitationMigration, "token_hash", "QA-ALP-259");
    expectContains(createInvitationAction, "createHash", "QA-ALP-259");
  });

  it("QA-ALP-260 invalid invitation redemption fails closed", () => {
    expectPath(acceptInvitationAction, "QA-ALP-260");
    for (const marker of ["recipient_email", "expires_at", "revoked_at", "redeemed_at", "failed"]) {
      expectContains(acceptInvitationAction, marker, "QA-ALP-260");
    }
  });

  it("QA-ALP-261 invitation redemption is idempotent", () => {
    expectPath(acceptInvitationAction, "QA-ALP-261");
    expectContains(acceptInvitationAction, "upsert", "QA-ALP-261");
    expectContains(acceptInvitationAction, "idempot", "QA-ALP-261");
  });

  it("QA-ALP-262 invitation lifecycle is audited", () => {
    expectPath(invitationMigration, "QA-ALP-262");
    expectContains(invitationMigration, "course_invitation_events", "QA-ALP-262");
    for (const marker of ["created", "sent", "redeemed", "expired", "revoked", "failed"]) {
      expectContains(invitationMigration, marker, "QA-ALP-262");
    }
  });

  it("QA-ALP-263 batch invitations record each recipient outcome", () => {
    expectPath("src/server/actions/invitations/create-batch-invitations.ts", "QA-ALP-263");
    expectContains("src/server/actions/invitations/create-batch-invitations.ts", "recipientResults", "QA-ALP-263");
  });

  it("QA-ALP-264 revoke and reinstate require actor, reason and state evidence", () => {
    expectPath(changeEnrolmentAction, "QA-ALP-264");
    for (const marker of ["reason", "actorId", "previousStatus", "nextStatus"]) {
      expectContains(changeEnrolmentAction, marker, "QA-ALP-264");
    }
  });

  it("QA-ALP-265 revoked learners remain denied after governed revocation", () => {
    expectPath(changeEnrolmentAction, "QA-ALP-265");
    expectContains(changeEnrolmentAction, "revoked", "QA-ALP-265");
    expectContains("src/lib/services/enrolments/get-course-access.ts", "revoked", "QA-ALP-265");
    expectContains("src/lib/services/enrolments/get-course-access.ts", "canAccess: false", "QA-ALP-265");
  });

  it("QA-ALP-266 governed reinstatement restores access with an audit event", () => {
    expectPath(changeEnrolmentAction, "QA-ALP-266");
    expectContains(changeEnrolmentAction, "reinstated", "QA-ALP-266");
    expectContains(changeEnrolmentAction, "course_enrolment_events", "QA-ALP-266");
  });

  it("QA-ALP-267 pending enrolment is created without exposing content", () => {
    expectPath(createInvitationAction, "QA-ALP-267");
    expectContains(createInvitationAction, "pending", "QA-ALP-267");
    expectContains("src/lib/services/enrolments/get-course-access.ts", "pending", "QA-ALP-267");
    expectContains("src/lib/services/enrolments/get-course-access.ts", "canAccess: false", "QA-ALP-267");
  });
});
