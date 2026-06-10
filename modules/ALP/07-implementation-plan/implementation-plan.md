# APGI Learning Portal - Stage 8 Implementation Plan

## Status Header

| Field | Value |
|---|---|
| Artifact | Implementation Plan |
| Module | ALP - APGI Learning Portal |
| Stage | 8 - Implementation Plan |
| Version | 0.1 |
| Status | Draft - governed wave plan; build remains blocked |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/07-implementation-plan/implementation-plan.md |
| Prepared Date | 2026-06-10 |
| Prepared By | ChatGPT acting as Product Owner / Foreman / Governance proxy at user request |
| Upstream PBFAG | modules/ALP/06-pbfag/pbfag.md |
| Upstream Stage 6 PR | #46 - Add ALP Stage 6 QA-to-Red executable tests |
| Upstream Stage 7 PR | #47 - Add ALP Stage 7 PBFAG checklist |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This Stage 8 Implementation Plan breaks the APGI Learning Portal build into governed delivery waves with explicit scope, order, dependencies, handover logic, rollback/recovery, QA expectations, and evidence requirements.

This plan exists to prepare the build. It does not authorize implementation. Build remains blocked until Stage 9 Builder Checklist, Stage 10 IAA Pre-Brief, Stage 11 Builder Appointment, and formal Stage 12 Build Authorization are completed.

---

## 2. Canonical Authority

This plan is governed by the Pre-Build Stage Model canon. Stage 8 requires:

- delivery wave breakdown with explicit scope per wave;
- wave sequencing with dependency declarations;
- handover logic between waves;
- builder assignment per wave, indicative only pending Stage 9;
- rollback and recovery plan per wave;
- full traceability from waves to FRS, TRS, and Architecture items;
- no placeholder waves or TBD scope entries.

---

## 3. Upstream Inputs

| Input | Path / Source | Status |
|---|---|---|
| Stage 1 App Description | modules/ALP/00-app-description/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md | Filed on main |
| Stage 2 UX Workflow & Wiring Spec | modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md | Carry-forward verify/file before builder appointment |
| Stage 3 FRS | modules/ALP/02-frs/functional-requirements.md | Carry-forward verify/file before builder appointment |
| Stage 4 TRS | modules/ALP/03-trs/technical-requirements-specification.md | Carry-forward verify/file before builder appointment |
| Stage 5 Architecture v0.2 | modules/ALP/04-architecture/architecture.md | Carry-forward verify/file before builder appointment |
| Stage 6 QA-to-Red | modules/ALP/05-qa-to-red/qa-to-red.md | Filed on main by PR #46 |
| Stage 6 RED Proof | modules/ALP/05-qa-to-red/red-proof-report.md | Filed on main by PR #46 |
| Stage 7 PBFAG | modules/ALP/06-pbfag/pbfag.md | Filed on main by PR #47 |

---

## 4. Implementation Strategy

### 4.1 Build Philosophy

The ALP build must be executed as a build-to-green sequence. Each wave must have its scope covered by the Stage 6 QA-to-Red suites (existing files, expanded where necessary) before implementation begins. The builder may implement only enough scope to turn that wave's assigned tests GREEN while preserving all prior GREEN suites.

### 4.2 Build Boundaries

The implementation must deliver the APGI Core LMS Version 1 only:

- learner auth and role access;
- invitation/manual/payment enrolment;
- learner profile and private files;
- dashboard and course cards;
- course shell and read-only URL-module unit viewer;
- progress and completion;
- assessment submission and evidence upload;
- AIMC Gateway AI evaluation;
- human review;
- certificates;
- admin operations;
- reports;
- audit;
- privacy, RLS, accessibility, deployment, and CWT evidence.

The implementation must not add future-scope features such as SCORM/cmi5 runtime, xAPI/LRS, LTI, Open Badges, multi-tenant white-label, AI tutor, mobile/offline app, or pathway builder unless separately authorized.

### 4.3 General Execution Rules

- No build starts before Stage 11 appointment and Stage 12 authorization.
- No wave starts until prior wave closure evidence is filed.
- No wave closes unless assigned RED tests and all prior wave regression tests are GREEN.
- No wave closes without physical evidence.
- No scope may be added without change-propagation audit.
- No local-only proof is sufficient for deployment/CWT closure.
- STOP-AND-FIX applies at the first failing gate.

---

## 5. Delivery Wave Overview

| Wave | Name | Primary Outcome | Required QA Suites |
|---|---|---|---|
| W0 | Foundation / Scaffold | Tooling, env, repo structure, base app shell, Supabase config skeleton | governance-artifacts, architecture-inventory, deployment-cwt subset |
| W1 | Auth + Profile + Files | Auth, roles, protected layouts, profile, private profile file upload | auth, profile-files, security-privacy subset |
| W2 | Dashboard + Course Shell + Unit Viewer | Learner dashboard, course cards, course shell, sidebar, read-only URL-module unit viewer | dashboard, course-shell, accessibility subset |
| W3 | Progress + Completion | Progress events, learner progress, module/course completion, next action | progress-completion, dashboard, course-shell regression |
| W4 | Enrolment + Payments | invitation, manual enrolment, Stripe checkout/webhook/idempotency | invitation, payments, admin subset, audit subset |
| W5 | Assessment Submission | assessment definitions, rubrics, attempts, written/evidence submission | assessment-submission, profile-files regression |
| W6 | AI Evaluation + Human Review | AIMC Gateway adapter, AI states, reviewer queue, final outcomes | ai-evaluation, human-review, audit |
| W7 | Certificates | eligibility, generation, storage, download, certificate events | certificate, progress-completion regression |
| W8 | Admin Reports + Audit | admin operations, reports, audit UI, report filters | admin, reports, audit |
| W9 | Deployment + CWT | deployed integrated LMS, CWT evidence package, final proof | deployment-cwt, security-privacy, accessibility, all regression |

---

## 6. Wave Details

### W0 - Foundation / Scaffold

**Scope**:

- Ensure Next.js App Router baseline remains buildable.
- Add/confirm Vitest test scripts and Stage 6 RED test execution.
- Add `.env.example` with all ALP-required variables.
- Add `src/lib/config/env.ts` environment validation.
- Establish `src/components`, `src/lib`, `src/server`, `supabase/migrations`, and evidence directories.
- Add base app shell, error, unauthorized, loading, and empty state components as needed.
- Add Supabase client/server helper skeletons.

**Files / Areas**:

- `package.json`
- `.env.example`
- `src/lib/config/env.ts`
- `src/lib/supabase/*`
- `src/components/layout/app-shell.tsx`
- `src/components/ui/*`
- `app/error.tsx`
- `app/not-found.tsx`
- `app/unauthorized.tsx` or approved equivalent
- `docs/edge-functions/APGI_LEARNING_PORTAL_EDGE_FUNCTION_REGISTRY.md`

**Dependencies**: Stage 6 and Stage 7 filed.

**QA to Turn GREEN**:

- `governance-artifacts.spec.ts` applicable W0 rows.
- `architecture-inventory.spec.ts` W0 inventory rows.
- `deployment-cwt.spec.ts` build/typecheck/env subset.

**Handover to W1**:

- Base paths and env validation exist.
- Build/typecheck work.
- RED tests still fail only for downstream missing features.

**Rollback / Recovery**:

- Revert W0 scaffold commit if build/typecheck regresses.
- Preserve Stage 6 tests and docs.

**Evidence**:

- Build/typecheck log.
- RED/GREEN delta summary for W0 tests.
- File inventory screenshot or command output.

---

### W1 - Auth + Profile + Files

**Scope**:

- Supabase Auth integration.
- `learners`, `user_roles`, `profiles`, `file_metadata` base tables.
- Role model for learner/admin/reviewer/course_publisher.
- Protected layouts and server-side role checks.
- Login/logout/session handling.
- Profile form with certificate-critical fields.
- Private photo/CV upload route/action.
- Storage buckets and signed/private access policy for profile files.
- Audit hooks for profile/file changes where required.

**Files / Areas**:

- `app/(public)/login/page.tsx`
- `app/(learner)/profile/page.tsx`
- `src/components/auth/*`
- `src/components/profile/profile-form.tsx`
- `src/components/files/file-upload-control.tsx`
- `src/server/actions/profiles/update-profile.ts`
- `src/server/actions/files/upload-profile-file.ts`
- `supabase/migrations/001_alp_auth_profile.sql`
- `supabase/migrations/006_alp_files_certificates_notifications_audit.sql` profile/file subset
- `supabase/migrations/007_alp_rls_policies.sql` profile/file subset

**Dependencies**: W0 closed.

**QA to Turn GREEN**:

- `auth.spec.ts`
- `security-privacy.spec.ts` (profile + private storage/RLS assertions)
- `architecture-inventory.spec.ts` (route/action inventory assertions)

**Handover to W2**:

- Authenticated learner/admin/reviewer session and role checks work.
- Learner profile is persisted and file metadata/storage is private.

**Rollback / Recovery**:

- Roll back migrations if auth/profile schema blocks login.
- Keep migration rollback notes and Supabase backup before applying production migrations.

**Evidence**:

- Login proof.
- Profile save proof.
- File upload/private access proof.
- RLS negative proof for cross-learner profile/file access.

---

### W2 - Dashboard + Course Shell + Unit Viewer

**Scope**:

- Course metadata schema: courses, course_modules, learning_units, content_links.
- Seed VPSHR Level 0 course metadata and read-only content links.
- Learner dashboard aggregation.
- Course cards with progress placeholders.
- Course shell with sidebar.
- Unit viewer with iframe/link launch, external fallback, full-screen/expanded view.
- Preserve URL-module branch/deployment as read-only.

**Files / Areas**:

- `app/(learner)/dashboard/page.tsx`
- `app/(learner)/learn/[courseSlug]/page.tsx`
- `app/(learner)/learn/[courseSlug]/units/[unitSlug]/page.tsx`
- `src/components/dashboard/*`
- `src/components/course/*`
- `src/lib/services/dashboard/get-dashboard.ts`
- `src/lib/services/courses/get-course-shell.ts`
- `src/lib/services/courses/get-unit-content.ts`
- `supabase/migrations/002_alp_courses_content.sql`
- `supabase/migrations/009_alp_seed_vpshr_level_0.sql`

**Dependencies**: W0-W1 closed.

**QA to Turn GREEN**:

- `architecture-inventory.spec.ts` (dashboard + learner routes/components inventory)
- `course-shell.spec.ts`.
- accessibility sidebar/unit viewer subset.

**Handover to W3**:

- Course shell can display seeded course/module/unit hierarchy.
- Unit viewer can open or safely fallback for URL-module content.

**Rollback / Recovery**:

- Revert seed data if URLs are wrong.
- Keep URL source read-only; never mutate URL branch.

**Evidence**:

- Dashboard screenshot.
- Course shell/sidebar screenshot.
- Unit viewer and fallback proof.

---

### W3 - Progress + Completion

**Scope**:

- progress_events, learner_progress, completion_states.
- Idempotent progress event recording.
- Unit opened/completed states.
- Module/course completion evaluation.
- Next learning action service.
- Dashboard/sidebar progress updates.
- Certificate eligibility pre-check hook.

**Files / Areas**:

- `src/server/actions/progress/record-progress-event.ts`
- `src/lib/services/completion/evaluate-completion-rule.ts`
- `src/lib/services/completion/get-next-learning-action.ts`
- `src/components/progress/progress-indicator.tsx`
- `supabase/migrations/004_alp_progress_completion.sql`

**Dependencies**: W2 closed.

**QA to Turn GREEN**:

- `course-shell.spec.ts` (expanded for progress/completion assertions).
- regression: `auth.spec.ts`, `security-privacy.spec.ts`, `architecture-inventory.spec.ts`, `deployment-cwt.spec.ts`.

**Handover to W4**:

- Learner progress persists and is visible in dashboard/sidebar.
- Completion rules can drive assessment unlock and certificate eligibility later.

**Rollback / Recovery**:

- Roll back completion rule changes if they grant access incorrectly.
- Keep progress event table append-only/idempotent where possible.

**Evidence**:

- DB rows for progress events and learner_progress.
- Sidebar/dashboard before/after screenshots.

---

### W4 - Enrolment + Payments

**Scope**:

- Invitations table and acceptance flow.
- Manual enrolment admin flow.
- Stripe checkout session creation.
- Stripe webhook with signature verification and idempotency.
- Enrolment state activation/suspension/cancelled.
- Payment events and admin payment visibility.
- Audit events for enrolment/payment changes.

**Files / Areas**:

- `app/(public)/invite/[token]/page.tsx`
- `app/(public)/courses/[courseSlug]/buy/page.tsx`
- `app/(public)/checkout/status/page.tsx`
- `app/(admin)/admin/enrolments/page.tsx`
- `app/(admin)/admin/payments/page.tsx`
- `src/server/actions/invitations/accept-invitation.ts`
- `src/server/actions/enrolments/manual-enrolment.ts`
- `src/server/actions/payments/create-checkout-session.ts`
- `app/api/webhooks/stripe/route.ts`
- `supabase/migrations/003_alp_enrolments_payments.sql`

**Dependencies**: W1 auth and W2 course metadata closed.

**QA to Turn GREEN**:

- `architecture-inventory.spec.ts` (invite/buy/checkout/admin routes and actions)
- `deployment-cwt.spec.ts` (Stripe webhook route)
- `security-privacy.spec.ts` (webhook signing secret + privacy/RLS assertions)

**Handover to W5**:

- Learner access can be granted by invite/manual/payment.
- Course access guard is based on active enrolment.

**Rollback / Recovery**:

- Disable Stripe webhook if duplicate or invalid enrolments occur.
- Reconcile payment_events and enrolments before retry.

**Evidence**:

- Invite acceptance proof.
- Stripe sandbox webhook proof.
- Manual enrolment admin proof.
- Audit rows.

---

### W5 - Assessment Submission

**Scope**:

- Assessment, rubric, assignment, attempt, submission, assessment_files schema.
- Admin assessment/rubric management.
- Learner assessment list/detail.
- Prerequisite/availability checks.
- Written response and evidence upload.
- Attempt immutability after submission.
- Retake attempt counter and attempt limit.
- Audit assessment submission.

**Files / Areas**:

- `app/(learner)/learn/[courseSlug]/assessments/page.tsx`
- `app/(learner)/learn/[courseSlug]/assessments/[assessmentId]/page.tsx`
- `app/(admin)/admin/assessments/page.tsx`
- `src/components/assessments/*`
- `src/lib/services/assessments/get-assessment.ts`
- `src/server/actions/assessments/submit-assessment.ts`
- `src/server/actions/files/upload-assessment-file.ts`
- `src/server/actions/admin/admin-save-assessment.ts`
- `supabase/migrations/005_alp_assessment_ai_review.sql` assessment subset

**Dependencies**: W1 files, W3 completion, W4 enrolment/access.

**QA to Turn GREEN**:

- `assessment-submission.spec.ts`.
- profile-files regression for evidence uploads.
- security/privacy evidence access tests.

**Handover to W6**:

- Assessment attempts/submissions are persisted and ready for AI evaluation/review.

**Rollback / Recovery**:

- Block assessment activation if rubric/pass mark invalid.
- Roll back destructive assessment admin changes by versioning rather than overwriting active assessments.

**Evidence**:

- Assessment creation proof.
- Learner submission proof.
- Evidence upload proof.
- Attempt immutability proof.

---

### W6 - AI Evaluation + Human Review

**Scope**:

- AIMC Gateway-only adapter.
- AI evaluation request/response schema.
- ai_evaluations persistence.
- Timeout/invalid/low-confidence routing to review.
- Reviewer queue/detail.
- Human decision form with required feedback/reason.
- Pass/fail/resubmission state handling.
- Review decision audit.

**Files / Areas**:

- `src/server/actions/ai/evaluate-assessment-via-aimc.ts`
- `src/server/actions/reviews/review-assessment.ts`
- `app/(admin)/admin/reviews/page.tsx`
- `src/components/reviews/review-queue.tsx`
- `src/components/reviews/review-decision-form.tsx`
- `supabase/migrations/005_alp_assessment_ai_review.sql` AI/review subset

**Dependencies**: W5 closed.

**QA to Turn GREEN**:

- `assessment-submission.spec.ts` (AIMC evaluation + human review queue/action assertions)
- regression: `security-privacy.spec.ts`, `architecture-inventory.spec.ts`.

**Handover to W7**:

- Assessment outcomes can be finalized and contribute to certificate eligibility.

**Rollback / Recovery**:

- If AIMC fails, all affected attempts move to human review rather than failing closed or passing silently.
- Disable AI auto-finalization if confidence/review policy fails.

**Evidence**:

- AIMC mock/staging request/response proof.
- AI failure-to-review proof.
- Human review pass/fail proof.
- Audit rows.

---

### W7 - Certificates

**Scope**:

- Certificate eligibility service.
- certificate and certificate_events schema.
- Certificate ID generation/signing.
- PDF/artifact generation.
- Private certificate storage and scoped download.
- Certificate-critical profile lock after generation.
- Admin certificate view/revoke support.

**Files / Areas**:

- `app/(learner)/certificates/page.tsx`
- `app/(learner)/certificates/[certificateId]/page.tsx`
- `app/(admin)/admin/certificates/page.tsx`
- `src/components/certificates/*`
- `src/server/actions/certificates/generate-certificate.ts`
- `src/server/actions/certificates/get-certificate-file.ts`
- `supabase/migrations/006_alp_files_certificates_notifications_audit.sql` certificate subset

**Dependencies**: W3 completion and W6 finalized assessment outcomes.

**QA to Turn GREEN**:

- `certificate.spec.ts`.
- security/privacy certificate access tests.
- audit certificate event tests.

**Handover to W8**:

- Certificate issuance and status can be reported/admin-reviewed.

**Rollback / Recovery**:

- If certificate generation fails, keep eligibility intact and show safe retry.
- Revoke certificate through audited admin flow if incorrect certificate issued.

**Evidence**:

- Eligibility blocked proof.
- Certificate generated PDF proof.
- Download proof.
- Audit event proof.

---

### W8 - Admin Reports + Audit

**Scope**:

- Admin learner search/list/detail.
- Admin course metadata management.
- Admin payments/certificates/reviews entry points.
- Progress report.
- Assessment report.
- Enrolment/payment report.
- Certificate report.
- Audit log UI and query action.
- Report filters and empty states.

**Files / Areas**:

- `app/(admin)/admin/page.tsx`
- `app/(admin)/admin/learners/page.tsx`
- `app/(admin)/admin/courses/page.tsx`
- `app/(admin)/admin/reports/page.tsx`
- `app/(admin)/admin/audit/page.tsx`
- `src/components/admin/admin-table.tsx`
- `src/components/reports/report-table.tsx`
- `src/components/audit/audit-log-table.tsx`
- `src/server/actions/admin/*`
- `src/lib/services/audit/write-audit-log.ts`
- `supabase/migrations/008_alp_indexes_views.sql`

**Dependencies**: W1-W7 core data exists.

**QA to Turn GREEN**:

- `architecture-inventory.spec.ts` (admin/reports/audit routes + core components inventory)
- regression: `security-privacy.spec.ts`.

**Handover to W9**:

- Admin can verify the full learner/course/payment/assessment/certificate/audit lifecycle.

**Rollback / Recovery**:

- Disable report export if it leaks restricted data.
- Revert admin mutation routes if role guard failure found.

**Evidence**:

- Admin dashboard screenshots.
- Reports screenshots.
- Audit query screenshots.
- RLS negative proof for non-admin access.

---

### W9 - Deployment + CWT

**Scope**:

- Deployed Vercel preview/staging environment.
- Supabase migrations applied to target environment.
- Storage buckets configured.
- Stripe sandbox webhook configured.
- AIMC mock/staging gateway configured.
- Email provider configured or explicitly disabled with fallback.
- Full CWT execution.
- Evidence package filed.
- CWT closure report.

**Files / Areas**:

- `.agent-admin/evidence/deployment/wave-9/*`
- `.agent-admin/evidence/rls-audit/wave-9.md`
- `.agent-admin/evidence/ai-assessment/wave-9/*`
- `.agent-admin/evidence/certificates/wave-9/*`
- `.agent-admin/evidence/accessibility/wave-9/*`
- `architecture/builds/ALP_BUILD_001_DRAFT/CWT_CLOSURE_REPORT.md`
- `modules/ALP/BUILD_PROGRESS_TRACKER.md`

**Dependencies**: W0-W8 closed GREEN.

**QA to Turn GREEN**:

- `deployment-cwt.spec.ts`.
- all prior suites as regression.
- accessibility/security/privacy full pass.

**Handover to final acceptance**:

- CWT proves the LMS works end-to-end.
- Product owner can verify browser workflows without code review.

**Rollback / Recovery**:

- Roll back Vercel deployment.
- Restore Supabase from backup or reverse migrations.
- Disable payment/webhook/AIMC integrations if they fail smoke tests.

**Evidence**:

- Deployment URL.
- Build/typecheck/test logs.
- Migration proof.
- Storage bucket proof.
- RLS negative proof.
- Invite/payment/manual enrolment proof.
- Profile upload proof.
- Course shell proof.
- Progress/completion proof.
- Assessment/AI/review proof.
- Certificate PDF proof.
- Reports/audit proof.
- Accessibility proof.
- CWT closure report.

---

## 7. Wave Dependency Matrix

| Wave | Depends On | Blocks |
|---|---|---|
| W0 | Stage 11 appointment and Stage 12 build authorization | W1-W9 |
| W1 | W0 | W2, W4, W5, W9 |
| W2 | W1 | W3, W5, W9 |
| W3 | W2 | W5, W7, W9 |
| W4 | W1, W2 | W5, W9 |
| W5 | W1, W3, W4 | W6, W7, W9 |
| W6 | W5 | W7, W9 |
| W7 | W3, W6 | W8, W9 |
| W8 | W1-W7 | W9 |
| W9 | W0-W8 | final acceptance |

---

## 8. Traceability Matrix

| Wave | FRS/TRS/Architecture Domains | QA Suites |
|---|---|---|
| W0 | OPS, deployment, env, architecture inventory | governance-artifacts, architecture-inventory, deployment-cwt subset |
| W1 | AUTH, PROF, FILE, SEC, PRIV | auth, profile-files, security-privacy |
| W2 | DASH, COURSE, UNIT, A11Y | dashboard, course-shell, accessibility |
| W3 | PROG, COMP | progress-completion |
| W4 | ENR, PAY, AUD | invitation, payments, admin subset, audit subset |
| W5 | ASM, FILE, SEC | assessment-submission, profile-files, security-privacy |
| W6 | AI, REV, AUD | ai-evaluation, human-review, audit |
| W7 | CERT, FILE, AUD | certificate, security-privacy, audit |
| W8 | ADM, REP, AUD | admin, reports, audit |
| W9 | OPS, CWT, SEC, A11Y | deployment-cwt, all regression suites |

---

## 9. Builder Assignment Plan

Builder assignment is indicative only. Actual assignment is Stage 11 and requires Stage 9 Builder Checklist plus Stage 10 IAA Pre-Brief.

| Wave | Indicative Builder Role | Required Competence |
|---|---|---|
| W0 | Foundation / Platform Builder | Next.js, TypeScript, Vercel, env validation, repo structure |
| W1 | Auth/Data/Security Builder | Supabase Auth, RLS, storage, secure server actions |
| W2 | Learner UX Builder | Next.js UI, route guards, content embedding, accessibility |
| W3 | Progress/Data Builder | state persistence, completion rules, idempotency |
| W4 | Payment/Enrolment Builder | Stripe, webhooks, transactional state, audit |
| W5 | Assessment Builder | form workflows, uploads, immutable attempts, rubrics |
| W6 | AI/Review Builder | AIMC Gateway, review workflow, failure handling |
| W7 | Certificate Builder | PDF/artifact generation, eligibility, secure download |
| W8 | Admin/Reporting Builder | admin UX, reports, audit query, access control |
| W9 | Deployment/CWT Builder | Vercel/Supabase deployment, CWT evidence, smoke tests |

---

## 10. Handover Logic

Each wave handover must include:

- scope completed statement;
- tests run and GREEN summary;
- regression status for prior waves;
- evidence artifact links/paths;
- database migration status;
- RLS/security status if applicable;
- known issues, all of which must be non-blocking or formally waived;
- next wave readiness statement.

No wave may hand over with unfiled required evidence.

---

## 11. Rollback and Recovery Plan

| Failure Type | Recovery Action |
|---|---|
| Build/typecheck failure | stop wave, fix before merge, no handover |
| Migration failure | restore backup/reverse migration, correct migration, rerun in staging |
| RLS leak | stop immediately, patch policy, rerun negative tests, inspect audit |
| Payment duplicate/webhook issue | disable webhook, reconcile payment_events/enrolments, patch idempotency |
| AIMC failure | route attempts to human review, disable AI finalization until fixed |
| File storage/privacy failure | revoke URLs, patch bucket/RLS policy, rerun storage tests |
| Certificate wrong issuance | revoke certificate, audit event, patch eligibility/generator |
| Deployment failure | roll back Vercel deployment, inspect logs, rerun CWT after fix |
| CWT failure | stop final acceptance, fix failing path, rerun full CWT |

---

## 12. Evidence Requirements by Wave

| Wave | Evidence Required |
|---|---|
| W0 | build/typecheck logs, env validation proof, scaffold inventory proof |
| W1 | auth proof, role denial proof, profile save proof, file upload/private access proof |
| W2 | dashboard/course shell/unit viewer screenshots, content fallback proof |
| W3 | progress DB rows, completion state proof, dashboard/sidebar update proof |
| W4 | invite proof, Stripe sandbox proof, manual enrolment proof, audit proof |
| W5 | assessment config proof, learner submission proof, evidence upload proof |
| W6 | AIMC evaluation proof, failure-to-review proof, reviewer decision proof |
| W7 | eligibility blocked proof, certificate generated proof, download proof |
| W8 | admin reports proof, audit query proof, non-admin denial proof |
| W9 | deployment URL, full CWT screenshots/logs, RLS negative logs, final closure report |

---

## 13. Stage 8 Gate Checklist

| Check | Result |
|---|---|
| Delivery waves defined | PASS |
| Scope explicit per wave | PASS |
| Sequencing declared | PASS |
| Dependencies declared | PASS |
| Handover logic declared | PASS |
| Indicative builder roles declared | PASS |
| Rollback/recovery declared | PASS |
| Traceability to FRS/TRS/Architecture domains declared | PASS |
| QA suites mapped to waves | PASS |
| No TBD wave scope | PASS |
| Build authorization avoided | PASS |

---

## 14. Remaining Governance Gates

Stage 8 completion does not authorize implementation. The following remain:

```text
Stage 9 - Builder Checklist
Stage 10 - IAA Pre-Brief
Stage 11 - Builder Appointment
Stage 12 - Build Authorization / Build Execution
```

Carry-forward verification from Stage 7 also remains before builder appointment:

- verify/file Stage 2 UX Workflow & Wiring Spec on `main`;
- verify/file Stage 3 FRS on `main`;
- verify/file Stage 4 TRS on `main`;
- verify/file Stage 5 Architecture v0.2 on `main`;
- verify/file Requirement Registry on `main`;
- confirm QA-ALP range accepted as module-local or canonical catalog registered.

---

## 15. Decision

```text
Stage 8 Implementation Plan: Draft PASS for Stage 9 Builder Checklist preparation.
Builder Appointment: BLOCKED.
Build / Implementation: BLOCKED.
```

---

## 16. Proxy Sign-Off

I, ChatGPT acting as Product Owner / Foreman / Governance proxy at user request, record that this Stage 8 Implementation Plan defines explicit implementation waves, dependencies, handover logic, rollback/recovery, traceability, QA mapping, and evidence requirements.

I do not authorize implementation or builder appointment.

---

## 17. Next Stage

Proceed to:

```text
modules/ALP/08-builder-checklist/builder-checklist.md
```

Build remains blocked.

---

## 18. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-10 | Initial Stage 8 Implementation Plan created after Stage 7 PBFAG merge. | ChatGPT acting as Product Owner / Foreman / Governance proxy | Draft PASS for Stage 9 preparation; build blocked |
