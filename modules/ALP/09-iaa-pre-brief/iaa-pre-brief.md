# APGI Learning Portal - Stage 10 IAA Pre-Brief

## Status Header

| Field | Value |
|---|---|
| Artifact | IAA Pre-Brief |
| Module | ALP - APGI Learning Portal |
| Stage | 10 - IAA Pre-Brief |
| Version | 0.1 |
| Status | Draft - IAA pre-brief package created; acknowledgements pending |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/09-iaa-pre-brief/iaa-pre-brief.md |
| Prepared Date | 2026-06-11 |
| Prepared By | ChatGPT acting as Product Owner / Foreman / Governance proxy at user request |
| Upstream Stage 9 | modules/ALP/08-builder-checklist/builder-checklist.md |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |
| ASSURANCE-TOKEN / PHASE_A_ADVISORY | Pending IAA acknowledgement |

---

## 1. Purpose

This Stage 10 IAA Pre-Brief provides the formal pre-build briefing package required before any builder appointment for the APGI Learning Portal.

It consolidates the wave task list, scope declaration, PBFAG result, RED QA reference, acceptance criteria, evidence obligations, risk controls, and acknowledgement requirements that must be understood before delegation.

This artifact does not appoint a builder and does not authorize implementation.

---

## 2. Canonical Authority

The Pre-Build Stage Model defines Stage 10 as a mandatory IAA-controlled pre-build briefing stage before builder appointment.

Stage 10 requires:

- Foreman invokes IAA agent with full pre-brief context;
- IAA generates a Pre-Brief artifact declaring acceptance criteria per task;
- Foreman and builders receive and acknowledge the Pre-Brief;
- IAA Pre-Brief artifact is filed in the designated location;
- ASSURANCE-TOKEN or PHASE_A_ADVISORY status is recorded before proceeding.

Gate condition:

```text
IAA Pre-Brief artifact exists and is acknowledged by Foreman and all designated builders. ASSURANCE-TOKEN or PHASE_A_ADVISORY status recorded.
```

---

## 3. Upstream Governance Chain

| Stage | Artifact | Status |
|---|---|---|
| Stage 6 | modules/ALP/05-qa-to-red/qa-to-red.md | Filed |
| Stage 6 | modules/ALP/05-qa-to-red/qa-catalog-alignment.md | Filed |
| Stage 6 | modules/ALP/05-qa-to-red/red-proof-report.md | Filed |
| Stage 7 | modules/ALP/06-pbfag/pbfag.md | Filed |
| Stage 8 | modules/ALP/07-implementation-plan/implementation-plan.md | Filed |
| Stage 8 | modules/ALP/07-implementation-plan/qa-and-traceability-resolution.md | Filed |
| Stage 9 | modules/ALP/08-builder-checklist/builder-checklist.md | Filed |
| Stage 9 | modules/ALP/08-builder-checklist/builder-checklist-review-resolution.md | Filed |

Carry-forward blockers from earlier stages still apply before builder appointment:

- verify/file Stage 2 UX Workflow & Wiring Spec on `main`;
- verify/file Stage 3 FRS on `main`;
- verify/file Stage 4 TRS on `main`;
- verify/file Stage 5 Architecture v0.2 on `main`;
- verify/file Requirement Registry on `main`;
- confirm QA-ALP range accepted as module-local or registered canonically;
- file Runtime/Deployment Contract before first build wave;
- file Golden Path Verification Pack before first build wave.

---

## 4. IAA Invocation Context

### 4.1 Product Scope

The APGI Learning Portal V1 build must deliver the APGI-owned LMS platform capability defined in the pre-build chain:

- learner login and role-based access;
- invitation/manual/payment enrolment;
- learner profile and private file upload;
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

Future-scope features remain excluded unless separately authorized: SCORM/cmi5 runtime, xAPI/LRS, LTI, Open Badges, multi-tenant white-label, AI tutor, mobile/offline app, and pathway builder.

### 4.2 Build Philosophy

The build must follow build-to-green execution:

- each wave begins only after appointment and formal build authorization;
- each wave is implemented only against approved scope;
- assigned RED tests must turn GREEN;
- prior wave regression tests must remain GREEN;
- no wave closes without filed evidence;
- STOP-AND-FIX applies at the first failing gate.

### 4.3 Builder Appointment Boundary

No builder is appointed by this artifact.

Builder appointment may occur only at Stage 11 after:

- Stage 10 is acknowledged by Foreman and all designated builders;
- ASSURANCE-TOKEN or PHASE_A_ADVISORY status is recorded;
- Stage 9 checklist has PASS for every appointed builder;
- all carry-forward blockers are resolved or explicitly recorded as Stage 11-blocking conditions.

---

## 5. Wave Task List and Acceptance Criteria

### W0 - Foundation / Scaffold

**Task scope**:

- confirm build/typecheck/test baseline;
- add or confirm `.env.example`;
- add `src/lib/config/env.ts`;
- establish `src/components`, `src/lib`, `src/server`, `supabase/migrations`, and evidence directories;
- add base app shell and safe error/empty/loading states;
- add Supabase helper skeletons.

**Acceptance criteria**:

- `npm run build` and `npm run typecheck` pass;
- Stage 6 W0-relevant tests pass;
- `.env.example` contains all ALP-required variable names, not secret values;
- environment validation fails safely for missing required variables;
- scaffold files exist at Stage 8 paths;
- evidence folder structure exists.

**Evidence required**:

- build/typecheck log;
- env validation proof;
- scaffold inventory proof;
- RED-to-GREEN delta summary.

---

### W1 - Auth + Profile + Files

**Task scope**:

- Supabase Auth integration;
- learner/admin/reviewer/course_publisher role model;
- protected layouts and server-side role checks;
- login/logout/session handling;
- profile form and certificate-critical fields;
- private photo/CV upload;
- file metadata and storage policy;
- audit hooks for profile/file changes.

**Acceptance criteria**:

- authenticated learner can access learner routes;
- anonymous user is denied protected routes;
- learner cannot access admin routes;
- profile data persists;
- photo/CV upload creates private file metadata and storage object;
- cross-learner profile/file access is denied;
- relevant audit events are recorded.

**Evidence required**:

- login proof;
- role-denial proof;
- profile save proof;
- file upload/private access proof;
- RLS negative proof.

---

### W2 - Dashboard + Course Shell + Unit Viewer

**Task scope**:

- dashboard and course cards;
- course/module/unit/content-link schema and seed;
- course shell route;
- sidebar with module/unit state;
- read-only external URL-module unit viewer;
- fallback for external content failure.

**Acceptance criteria**:

- learner dashboard displays enrolled course cards;
- course shell displays course/module/unit hierarchy;
- unit viewer opens URL-module content or safe fallback;
- URL-module source remains read-only;
- course shell remains usable after external content failure.

**Evidence required**:

- dashboard screenshot;
- course shell/sidebar screenshot;
- unit viewer launch proof;
- external content fallback proof.

---

### W3 - Progress + Completion

**Task scope**:

- progress events;
- learner progress;
- completion states;
- idempotent progress recording;
- module/course completion rule evaluation;
- next learning action;
- dashboard/sidebar progress updates.

**Acceptance criteria**:

- unit opened/completed events persist;
- duplicate progress events do not corrupt state;
- module/course completion reflects required unit/assessment rules;
- dashboard/sidebar update after completion;
- completion state can drive assessment unlock and certificate eligibility.

**Evidence required**:

- progress_events and learner_progress DB proof;
- completion state proof;
- dashboard/sidebar before-after screenshots.

---

### W4 - Enrolment + Payments

**Task scope**:

- invitations and acceptance;
- manual enrolment;
- Stripe checkout session creation;
- Stripe webhook signature verification and idempotency;
- enrolment state transitions;
- payment_events and admin payment visibility;
- audit of enrolment/payment changes.

**Acceptance criteria**:

- valid invite creates/links learner enrolment;
- invalid/expired/reused invite fails safely;
- manual enrolment works for admin only;
- successful Stripe payment activates enrolment;
- failed/cancelled payment does not grant access;
- duplicate webhook is idempotent;
- payment/enrolment events are audited.

**Evidence required**:

- invite acceptance proof;
- manual enrolment proof;
- Stripe sandbox checkout/webhook proof;
- idempotency proof;
- audit rows.

---

### W5 - Assessment Submission

**Task scope**:

- assessment/rubric/assignment/attempt/submission/evidence schema;
- admin assessment management;
- learner assessment list/detail;
- prerequisite and availability checks;
- written response and evidence upload;
- immutable submitted attempts;
- retake attempt rules;
- assessment submission audit.

**Acceptance criteria**:

- assessment cannot activate without required rubric/pass mark;
- learner sees locked/available states correctly;
- learner can submit written response and required evidence;
- unsupported/oversized evidence fails safely;
- submitted attempts are immutable;
- attempt count and limits are enforced;
- submission creates audit event.

**Evidence required**:

- assessment config proof;
- learner submission proof;
- evidence upload proof;
- immutability proof;
- audit row proof.

**Special QA precondition**:

If assessment evidence-upload scope exceeds currently executable Stage 6 coverage, `profile-files.spec.ts` must be created, committed, executed, and proven RED before implementing that expanded scope.

---

### W6 - AI Evaluation + Human Review

**Task scope**:

- AIMC Gateway-only adapter;
- AI evaluation request/response persistence;
- timeout/invalid/low-confidence routing to review;
- reviewer queue/detail;
- human review decisions;
- audit of AI/review actions.

**Acceptance criteria**:

- AI evaluation uses AIMC Gateway only;
- rubric and attempt context are included;
- invalid/timeout AI response routes to recoverable review state;
- low-confidence or borderline outcomes route to human review;
- reviewer can pass/fail/request resubmission with required reason;
- review updates assessment outcome and downstream eligibility;
- AI/review actions are audited.

**Evidence required**:

- AIMC mock/staging request/response proof;
- AI failure-to-review proof;
- reviewer decision proof;
- audit rows.

---

### W7 - Certificates

**Task scope**:

- certificate eligibility service;
- certificate and certificate_events schema;
- certificate ID generation;
- PDF/artifact generation;
- private certificate storage and scoped download;
- certificate-critical profile lock;
- admin certificate view/revoke support.

**Acceptance criteria**:

- incomplete profile/progress/assessment/payment blocks certificate;
- eligible learner can generate certificate;
- certificate includes required learner/course/issue/certificate ID fields;
- certificate download is scoped to authorized user/admin;
- certificate generation locks critical profile fields;
- certificate events are audited.

**Evidence required**:

- eligibility blocked proof;
- certificate generated proof;
- PDF/download proof;
- audit event proof.

---

### W8 - Admin Reports + Audit

**Task scope**:

- admin learner/course/enrolment/payment/certificate/review surfaces;
- progress, assessment, payment, certificate reports;
- report filters and empty states;
- audit log UI and query action;
- admin-only access enforcement.

**Acceptance criteria**:

- admin can search/list learners;
- admin can view and manage scoped course/enrolment/assessment/payment/certificate records;
- reports render correct rows and filters;
- non-admin is denied admin reports/audit;
- audit queries work and do not expose restricted records.

**Evidence required**:

- admin dashboard proof;
- report screenshots;
- audit query screenshot;
- non-admin denial proof.

---

### W9 - Deployment + CWT

**Task scope**:

- Vercel deployment;
- Supabase migrations applied;
- storage buckets configured;
- Stripe sandbox webhook configured;
- AIMC staging/mock configured;
- full CWT execution;
- evidence package and CWT closure report.

**Acceptance criteria**:

- deployed app is reachable;
- build/typecheck/test pass in target branch/CI;
- migrations and storage are configured;
- invite/manual/payment enrolment paths pass;
- profile/course/progress/assessment/AI/review/certificate/admin/report/audit paths pass;
- RLS/security negative tests pass;
- accessibility smoke passes;
- CWT closure report is filed.

**Evidence required**:

- deployment URL;
- CI/build/typecheck/test logs;
- migration proof;
- storage proof;
- full CWT evidence pack;
- CWT closure report.

---

## 6. Required Acknowledgements

### Foreman Acknowledgement

| Requirement | Status | Evidence |
|---|---|---|
| Foreman has received Stage 10 IAA Pre-Brief | Pending | Pending |
| Foreman confirms briefing is complete enough for builder acknowledgement | Pending | Pending |
| Foreman confirms no build authorization is granted by this artifact | Pending | Pending |
| Foreman confirms carry-forward blockers remain visible | Pending | Pending |

### Builder Acknowledgement Register

No builder is appointed by this artifact. Every future appointed builder must acknowledge the pre-brief before Stage 11 appointment.

| Candidate ID | Builder / Agent | Waves | Pre-Brief Received? | Acknowledged? | Evidence |
|---|---|---|---|---|---|
| BC-ALP-001 | To be assigned | W0 | Pending | Pending | Pending |
| BC-ALP-002 | To be assigned | W1 | Pending | Pending | Pending |
| BC-ALP-003 | To be assigned | W2 | Pending | Pending | Pending |
| BC-ALP-004 | To be assigned | W3 | Pending | Pending | Pending |
| BC-ALP-005 | To be assigned | W4 | Pending | Pending | Pending |
| BC-ALP-006 | To be assigned | W5 | Pending | Pending | Pending |
| BC-ALP-007 | To be assigned | W6 | Pending | Pending | Pending |
| BC-ALP-008 | To be assigned | W7 | Pending | Pending | Pending |
| BC-ALP-009 | To be assigned | W8 | Pending | Pending | Pending |
| BC-ALP-010 | To be assigned | W9 | Pending | Pending | Pending |

---

## 7. ASSURANCE-TOKEN / PHASE_A_ADVISORY Status

| Item | Status | Notes |
|---|---|---|
| IAA pre-brief artifact filed | PASS when this PR is merged | This artifact |
| Foreman acknowledgement | Pending | Required before Stage 11 |
| Builder acknowledgements | Pending | Required before Stage 11 |
| ASSURANCE-TOKEN | Pending | Not issued by this artifact |
| PHASE_A_ADVISORY | Pending | Not issued by this artifact |
| Stage 11 builder appointment readiness | Blocked | Pending acknowledgements and assurance/advisory status |

---

## 8. Pre-Brief Risk Register

| Risk ID | Risk | Control |
|---|---|---|
| IAA-ALP-RISK-001 | Builder starts before full appointment | Stage 10 explicitly blocks appointment/build |
| IAA-ALP-RISK-002 | Builder misses RED QA expansion-suite obligations | Stage 8 and Stage 9 resolution addenda carry forward expansion-suite rule |
| IAA-ALP-RISK-003 | Builder treats CI green as functional proof | Golden Path Verification Pack and CWT remain required |
| IAA-ALP-RISK-004 | Builder misses Runtime/Deployment Contract | Runtime/Deployment Contract remains required before first build wave |
| IAA-ALP-RISK-005 | Upstream changes are not propagated | Change-Propagation Audit is mandatory before build continues |
| IAA-ALP-RISK-006 | AIMC direct provider integration bypasses gateway | AIMC Gateway-only acceptance criteria and QA checks required |
| IAA-ALP-RISK-007 | Payment/webhook path grants invalid access | Stripe signature/idempotency acceptance criteria required |
| IAA-ALP-RISK-008 | Certificate issued incorrectly | eligibility/audit evidence required before closure |

---

## 9. Stage 10 Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| IAA Pre-Brief artifact exists | PASS when merged | This file |
| Full pre-brief context included | PASS | Product scope, wave tasks, PBFAG/RED references, acceptance criteria |
| Acceptance criteria per task/wave declared | PASS | Section 5 |
| Foreman acknowledgement recorded | PENDING | Must be recorded before Stage 11 |
| Builder acknowledgements recorded | PENDING | Must be recorded before Stage 11 |
| ASSURANCE-TOKEN or PHASE_A_ADVISORY recorded | PENDING | Required before Stage 11 |
| Builder appointment authorized | NO | Stage 11 only |
| Build authorized | NO | Stage 12 only |

---

## 10. Stage 10 Decision

```text
Stage 10 IAA Pre-Brief: Draft PASS for Stage 11 preparation once acknowledgements and ASSURANCE-TOKEN / PHASE_A_ADVISORY are recorded.
Builder Appointment: BLOCKED.
Build / Implementation: BLOCKED.
```

This artifact is complete as a pre-brief package, but it does not itself complete all Stage 10 acknowledgements.

---

## 11. Proxy Sign-Off

I, ChatGPT acting as Product Owner / Foreman / Governance proxy at user request, record that this Stage 10 IAA Pre-Brief provides the required pre-brief context, acceptance criteria, acknowledgement structure, and assurance/advisory status register.

I do not authorize builder appointment or implementation.

---

## 12. Next Stage

After Stage 10 acknowledgements and ASSURANCE-TOKEN / PHASE_A_ADVISORY status are recorded, proceed to:

```text
modules/ALP/10-builder-appointment/builder-appointment.md
```

Build remains blocked.

---

## 13. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-11 | Initial Stage 10 IAA Pre-Brief created after Stage 9 Builder Checklist merge. | ChatGPT acting as Product Owner / Foreman / Governance proxy | Draft PASS for Stage 11 preparation pending acknowledgements; builder appointment/build blocked |
