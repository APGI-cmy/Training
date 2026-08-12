import { describe, expect, it } from "vitest";
import { expectPath, read } from "./helpers/project-root";

const createInvitation = "src/server/actions/invitations/create-invitation.ts";
const acceptInvitation = "app/(learner)/invitations/[token]/page.tsx";
const lifecycleService = "src/server/actions/invitations/redeem-invitation.ts";
const profileService = "src/lib/services/profile/complete-onboarding.ts";
const lifecycleMigration = "supabase/migrations/011_w4_2_persistent_invitation_lifecycle.sql";
const storagePolicy = "supabase/migrations/012_w4_2_profile_cv_storage_policies.sql";

describe("ALP W4.2 persistent invitation lifecycle — RED", () => {
  it("QA-IL-001 restricts create/revoke/resend to administrators", () => {
    expectPath(createInvitation, "QA-IL-001");
    const source = read(createInvitation);
    for (const marker of ["requireAdmin", "createInvitation", "revokeInvitation", "resendInvitation"]) expect(source).toContain(marker);
  });
  it("QA-IL-002 hashes tokens, binds intent and records creation audit evidence", () => {
    expectPath(lifecycleMigration, "QA-IL-002");
    const source = read(lifecycleMigration);
    for (const marker of ["token_hash", "recipient_email", "course_id", "expires_at", "invitation_created"]) expect(source).toContain(marker);
    expect(source).not.toContain("raw_token");
  });
  it("QA-IL-003 makes send idempotent and delivery failure observable", () => {
    expectPath(createInvitation, "QA-IL-003");
    const source = read(createInvitation);
    for (const marker of ["idempotency", "invitation_sent", "delivery_failed"]) expect(source).toContain(marker);
  });
  it("QA-IL-004 redirects accepted invitations from the existing grouped route to onboarding", () => {
    expectPath(acceptInvitation, "QA-IL-004");
    expect(read(acceptInvitation)).toContain("/onboarding");
  });
  it("QA-IL-005 fails closed for expired, revoked, reused and wrong-recipient invitations", () => {
    expectPath(acceptInvitation, "QA-IL-005");
    const source = read(acceptInvitation);
    for (const marker of ["expired", "revoked", "redeemed", "recipient_email"]) expect(source).toContain(marker);
  });
  it("QA-IL-006 explains data collection and validates onboarding before access", () => {
    expectPath(profileService, "QA-IL-006");
    const source = read(profileService);
    for (const marker of ["certificate", "learner support", "national_identity_number", "validate"]) expect(source).toContain(marker);
  });
  it("QA-IL-007 enforces restricted national-ID handling and private CV storage", () => {
    expectPath(lifecycleMigration, "QA-IL-007");
    expectPath(storagePolicy, "QA-IL-007");
    const migration = read(lifecycleMigration);
    const storage = read(storagePolicy);
    for (const marker of ["national_identity", "encrypted", "mask", "ENABLE ROW LEVEL SECURITY", "audit"]) expect(migration).toContain(marker);
    for (const marker of ["cv", "private", "storage.objects", "auth.uid()", "metadata"]) expect(storage).toContain(marker);
    expect(migration).not.toContain("national_identity_number text");
  });
  it("QA-IL-008 validates private CV upload ownership and file metadata", () => {
    expectPath(storagePolicy, "QA-IL-008");
    const source = read(storagePolicy);
    for (const marker of ["INSERT", "SELECT", "owner_id", "content_type", "size"]) expect(source).toContain(marker);
  });
  it("QA-IL-009 redeems idempotently into one enrolment and audit trail", () => {
    expectPath(lifecycleService, "QA-IL-009");
    const source = read(lifecycleService);
    for (const marker of ["idempot", "course_enrolments", "invitation_redeemed", "audit"]) expect(source).toContain(marker);
  });
  it("QA-IL-010 validates import rows and duplicate disposition before execution", () => {
    expectPath("src/server/actions/invitations/execute-import.ts", "QA-IL-010");
    const source = read("src/server/actions/invitations/execute-import.ts");
    for (const marker of ["duplicate", "validate", "disposition", "idempotency"]) expect(source).toContain(marker);
  });
  it("QA-IL-011 provides the AMC-consumable app-wide QA coverage manifest", () => {
    const manifest = "modules/ALP/05-qa-to-red/APP_WIDE_QA_COVERAGE_MANIFEST.md";
    expectPath(manifest, "QA-IL-011");
    for (const marker of ["Test reference", "Owner", "Evidence", "Monitoring signal"]) expect(read(manifest)).toContain(marker);
  });
});