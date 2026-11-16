# APGI Learning Portal - Stage 9 Builder Checklist

## Status Header

| Field | Value |
|---|---|
| Artifact | Builder Checklist |
| Module | ALP - APGI Learning Portal |
| Stage | 9 - Builder Checklist |
| Version | 0.1 |
| Status | Draft - Builder readiness checklist created; no builder appointed |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/08-builder-checklist/builder-checklist.md |
| Prepared Date | 2026-06-11 |
| Prepared By | ChatGPT acting as Product Owner / Foreman / Governance proxy at user request |
| Upstream Stage 8 | modules/ALP/07-implementation-plan/implementation-plan.md |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This Stage 9 Builder Checklist verifies builder-role fitness, scope alignment, protocol compliance, dependency readiness, and execution eligibility before any builder appointment.

This checklist is a hard gate before Stage 10 IAA Pre-Brief and Stage 11 Builder Appointment. It does not appoint a builder and does not authorize implementation.

---

## 2. Canonical Authority

The Pre-Build Stage Model defines Stage 9 as a distinct governance stage. It requires, per builder candidate:

- builder agent contract exists and is current;
- builder has read and acknowledged all relevant canon files for this build;
- builder has confirmed scope understanding wave by wave;
- builder has confirmed RED QA suite understanding;
- builder has confirmed architecture understanding;
- builder confirms no unresolved dependency blockers;
- builder confirms protocol compliance, including STOP-AND-FIX, evidence requirements, and merge gates;
- Foreman confirms role-fit for this specific build context.

Gate condition:

```text
Builder Checklist PASS for every appointed builder. Any FAIL blocks appointment.
```

---

## 3. Upstream Inputs

| Input | Path / Source | Status |
|---|---|---|
| Stage 6 QA-to-Red | modules/ALP/05-qa-to-red/qa-to-red.md | Filed on main |
| Stage 6 RED Proof | modules/ALP/05-qa-to-red/red-proof-report.md | Filed on main |
| Stage 7 PBFAG | modules/ALP/06-pbfag/pbfag.md | Filed on main |
| Stage 8 Implementation Plan | modules/ALP/07-implementation-plan/implementation-plan.md | Filed on main |
| Stage 8 QA/Traceability Resolution | modules/ALP/07-implementation-plan/qa-and-traceability-resolution.md | Filed on main |

Carry-forward items from Stage 7/8 still apply before builder appointment:

- verify/file Stage 2 UX Workflow & Wiring Spec on `main`;
- verify/file Stage 3 FRS on `main`;
- verify/file Stage 4 TRS on `main`;
- verify/file Stage 5 Architecture v0.2 on `main`;
- verify/file Requirement Registry on `main`;
- confirm QA-ALP range accepted as module-local or canonical catalog registered.

---

## 4. Builder Candidate Register

No builder is appointed by this artifact. Each proposed builder must be entered here before Stage 10.

| Candidate ID | Builder / Agent | Proposed Role | Proposed Waves | Contract Current? | Checklist Result |
|---|---|---|---|---|---|
| BC-ALP-001 | To be assigned | Foundation / Platform Builder | W0 | Pending | Pending |
| BC-ALP-002 | To be assigned | Auth / Data / Security Builder | W1 | Pending | Pending |
| BC-ALP-003 | To be assigned | Learner UX Builder | W2 | Pending | Pending |
| BC-ALP-004 | To be assigned | Progress / Completion Builder | W3 | Pending | Pending |
| BC-ALP-005 | To be assigned | Payment / Enrolment Builder | W4 | Pending | Pending |
| BC-ALP-006 | To be assigned | Assessment Builder | W5 | Pending | Pending |
| BC-ALP-007 | To be assigned | AI / Review Builder | W6 | Pending | Pending |
| BC-ALP-008 | To be assigned | Certificate Builder | W7 | Pending | Pending |
| BC-ALP-009 | To be assigned | Admin / Reporting Builder | W8 | Pending | Pending |
| BC-ALP-010 | To be assigned | Deployment / CWT Builder | W9 | Pending | Pending |

---

## 5. Universal Builder Checklist

Every builder candidate must pass every item below before appointment.

| Check ID | Check | Required Evidence | Status |
|---|---|---|---|
| BCHK-ALP-001 | Builder agent contract exists and is current | link/path to contract | Pending |
| BCHK-ALP-002 | Builder identity/role is recorded | candidate register updated | Pending |
| BCHK-ALP-003 | Builder has read Stage 6 QA-to-Red | acknowledgement recorded | Pending |
| BCHK-ALP-004 | Builder has read Stage 7 PBFAG | acknowledgement recorded | Pending |
| BCHK-ALP-005 | Builder has read Stage 8 Implementation Plan | acknowledgement recorded | Pending |
| BCHK-ALP-006 | Builder has read Stage 8 QA/Traceability Resolution | acknowledgement recorded | Pending |
| BCHK-ALP-007 | Builder has read relevant governance canon for assigned scope | acknowledgement recorded | Pending |
| BCHK-ALP-008 | Builder confirms wave-by-wave scope understanding | signed scope statement | Pending |
| BCHK-ALP-009 | Builder confirms RED QA suite understanding | QA suite acknowledgement | Pending |
| BCHK-ALP-010 | Builder confirms Architecture/TRS/FRS understanding for assigned scope | architecture/requirement acknowledgement | Pending |
| BCHK-ALP-011 | Builder confirms no unresolved dependency blockers for assigned wave | dependency statement | Pending |
| BCHK-ALP-012 | Builder confirms STOP-AND-FIX compliance | protocol acknowledgement | Pending |
| BCHK-ALP-013 | Builder confirms merge-gate compliance | merge-gate acknowledgement | Pending |
| BCHK-ALP-014 | Builder confirms evidence requirements per wave | evidence plan acknowledgement | Pending |
| BCHK-ALP-015 | Builder confirms no scope deviation without Foreman approval | scope-control acknowledgement | Pending |
| BCHK-ALP-016 | Foreman confirms role-fit for assigned wave(s) | Foreman sign-off | Pending |
| BCHK-ALP-017 | Candidate has no unresolved review warnings or blockers | warning check | Pending |
| BCHK-ALP-018 | Candidate understands build remains blocked until Stage 12 authorization | appointment-boundary acknowledgement | Pending |

Result rule:

```text
Any Pending or FAIL means the builder candidate is not appointable.
```

---

## 6. Wave-Specific Builder Readiness

### W0 - Foundation / Scaffold

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | package scripts, env validation, base directories, app shell, error states, Supabase helpers | Pending |
| QA understanding | governance-artifacts, architecture-inventory, deployment-cwt subset | Pending |
| Evidence understanding | build/typecheck logs, env validation proof, scaffold inventory proof | Pending |
| Dependency readiness | Stage 6, Stage 7, Stage 8 filed; Stage 11/12 still required before execution | Pending |
| Role-fit | Next.js, TypeScript, Vercel, environment configuration, repo structure | Pending |

### W1 - Auth + Profile + Files

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | Supabase Auth, roles, profile, private photo/CV files, storage, audit hooks | Pending |
| QA understanding | auth, architecture-inventory, security-privacy, deployment-cwt; profile-files expansion if needed | Pending |
| Evidence understanding | login proof, role denial proof, profile save proof, file upload/private access proof | Pending |
| Dependency readiness | W0 closed; auth/storage/RLS prerequisites known | Pending |
| Role-fit | Supabase Auth, RLS, private storage, secure server actions | Pending |

### W2 - Dashboard + Course Shell + Unit Viewer

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | dashboard, course cards, course shell, sidebar, read-only URL-module unit viewer | Pending |
| QA understanding | architecture-inventory, course-shell, security-privacy; dashboard/accessibility expansion if needed | Pending |
| Evidence understanding | dashboard screenshots, course shell screenshots, unit viewer/fallback proof | Pending |
| Dependency readiness | W0-W1 closed; course metadata seed ready | Pending |
| Role-fit | Next.js UI, route guards, external content embedding, accessible navigation | Pending |

### W3 - Progress + Completion

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | progress events, learner_progress, completion states, next action, certificate eligibility hook | Pending |
| QA understanding | course-shell, architecture-inventory, security-privacy; progress-completion expansion if needed | Pending |
| Evidence understanding | progress DB rows, sidebar/dashboard before-after proof | Pending |
| Dependency readiness | W2 closed | Pending |
| Role-fit | persisted state, idempotency, completion rule logic | Pending |

### W4 - Enrolment + Payments

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | invitation, manual enrolment, Stripe checkout, webhook signature/idempotency, payment_events | Pending |
| QA understanding | architecture-inventory, security-privacy, deployment-cwt; invitation/payments/audit expansion if needed | Pending |
| Evidence understanding | invite acceptance proof, Stripe sandbox proof, manual enrolment proof, audit rows | Pending |
| Dependency readiness | W1 auth and W2 course metadata closed | Pending |
| Role-fit | Stripe, webhooks, transactional state, audit | Pending |

### W5 - Assessment Submission

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | assessments, rubrics, attempts, submissions, evidence upload, immutable attempts | Pending |
| QA understanding | assessment-submission, security-privacy, architecture-inventory | Pending |
| Evidence understanding | assessment config proof, learner submission proof, evidence upload proof, immutability proof | Pending |
| Dependency readiness | W1 files, W3 completion, W4 enrolment/access closed | Pending |
| Role-fit | form workflows, uploads, validation, immutable assessment state | Pending |

### W6 - AI Evaluation + Human Review

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | AIMC Gateway-only adapter, AI states, reviewer queue, human decision, audit | Pending |
| QA understanding | assessment-submission, security-privacy, architecture-inventory; ai-evaluation/human-review/audit expansion if needed | Pending |
| Evidence understanding | AIMC request/response proof, failure-to-review proof, reviewer decision proof | Pending |
| Dependency readiness | W5 closed | Pending |
| Role-fit | AIMC integration, failure handling, review workflow | Pending |

### W7 - Certificates

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | eligibility, certificate generation, private storage, download, events, revocation | Pending |
| QA understanding | certificate, security-privacy, architecture-inventory, deployment-cwt; audit expansion if needed | Pending |
| Evidence understanding | eligibility blocked proof, certificate PDF proof, download proof, audit event proof | Pending |
| Dependency readiness | W3 completion and W6 outcomes closed | Pending |
| Role-fit | artifact/PDF generation, eligibility logic, private download | Pending |

### W8 - Admin Reports + Audit

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | admin learner/course/payment/cert/review surfaces, reports, audit query | Pending |
| QA understanding | architecture-inventory, security-privacy, deployment-cwt; admin/reports/audit expansion if needed | Pending |
| Evidence understanding | admin screenshots, report screenshots, audit query screenshots, non-admin denial proof | Pending |
| Dependency readiness | W1-W7 core data closed | Pending |
| Role-fit | admin UX, report filters, audit queries, access control | Pending |

### W9 - Deployment + CWT

| Check | Requirement | Status |
|---|---|---|
| Scope understanding | Vercel deployment, Supabase migrations, storage buckets, Stripe sandbox, AIMC staging/mock, CWT evidence | Pending |
| QA understanding | deployment-cwt plus all executable regression suites and expansion suites created in W1-W8 | Pending |
| Evidence understanding | full CWT evidence package and closure report | Pending |
| Dependency readiness | W0-W8 closed GREEN | Pending |
| Role-fit | deployment operations, smoke tests, CWT orchestration, evidence filing | Pending |

---

## 7. Dependency Readiness Checklist

| Check ID | Dependency | Required Before Builder Appointment | Status |
|---|---|---|---|
| DEP-ALP-001 | Stage 1 App Description filed | yes | Filed |
| DEP-ALP-002 | Stage 2 UX Workflow & Wiring Spec filed | yes | Carry-forward verify/file |
| DEP-ALP-003 | Stage 3 FRS filed | yes | Carry-forward verify/file |
| DEP-ALP-004 | Stage 4 TRS filed | yes | Carry-forward verify/file |
| DEP-ALP-005 | Stage 5 Architecture v0.2 filed | yes | Carry-forward verify/file |
| DEP-ALP-006 | Requirement Registry filed | yes | Carry-forward verify/file |
| DEP-ALP-007 | Stage 6 QA-to-Red and RED proof filed | yes | Filed |
| DEP-ALP-008 | Stage 7 PBFAG filed | yes | Filed |
| DEP-ALP-009 | Stage 8 Implementation Plan filed | yes | Filed |
| DEP-ALP-010 | Stage 8 QA/Traceability Resolution filed | yes | Filed |
| DEP-ALP-011 | QA-ALP range accepted module-locally or registered canonically | yes | Pending acceptance |
| DEP-ALP-012 | Runtime/Deployment Contract filed | before first build wave | Pending |
| DEP-ALP-013 | Golden Path Verification Pack filed | before first build wave | Pending |
| DEP-ALP-014 | Change-Propagation Audit log exists for any upstream changes | when applicable | Pending if change occurs |

Any unresolved dependency marked carry-forward, pending, or fail must be resolved before Stage 11 appointment unless explicitly moved into Stage 10 as an IAA-blocked pre-brief condition.

---

## 8. RED QA Understanding Checklist

Every builder candidate must acknowledge:

- Stage 6 tests are intentionally RED before implementation.
- A wave starts only when its scope is covered by existing or newly expanded RED tests.
- Non-existent suite names are not executable closure gates.
- If a planned expansion suite is needed, it must be created and proven RED before implementation of that scope.
- The builder may implement only enough to turn assigned RED tests GREEN.
- Prior wave regression suites must remain GREEN.
- No skipped/todo/fake tests may be used as proof.

Candidate acknowledgement:

| Candidate ID | Acknowledged? | Evidence |
|---|---|---|
| BC-ALP-001 | Pending | Pending |
| BC-ALP-002 | Pending | Pending |
| BC-ALP-003 | Pending | Pending |
| BC-ALP-004 | Pending | Pending |
| BC-ALP-005 | Pending | Pending |
| BC-ALP-006 | Pending | Pending |
| BC-ALP-007 | Pending | Pending |
| BC-ALP-008 | Pending | Pending |
| BC-ALP-009 | Pending | Pending |
| BC-ALP-010 | Pending | Pending |

---

## 9. Protocol Compliance Checklist

Every builder candidate must acknowledge:

| Protocol | Required Behaviour | Status |
|---|---|---|
| STOP-AND-FIX | stop at first failing gate; do not proceed around failure | Pending |
| Merge gates | all required GitHub/Vercel checks must pass before merge/wave closure | Pending |
| Evidence | no wave closure without filed evidence | Pending |
| Scope control | no scope deviation without Foreman approval and change-propagation audit | Pending |
| Security | no client secret leaks; no RLS bypass except controlled server-only service paths | Pending |
| Privacy | no cross-learner data exposure; private files stay private | Pending |
| AI boundary | AIMC Gateway-only; no direct AI provider integration unless later authorized | Pending |
| Payments | Stripe webhook signature and idempotency are mandatory | Pending |
| Certificates | certificate issuance requires eligibility proof and audit trail | Pending |

---

## 10. Role-Fit Decision Matrix

| Candidate ID | Proposed Wave(s) | Required Competence Verified? | Scope Fit? | Risk Fit? | Foreman Decision |
|---|---|---|---|---|---|
| BC-ALP-001 | W0 | Pending | Pending | Pending | Pending |
| BC-ALP-002 | W1 | Pending | Pending | Pending | Pending |
| BC-ALP-003 | W2 | Pending | Pending | Pending | Pending |
| BC-ALP-004 | W3 | Pending | Pending | Pending | Pending |
| BC-ALP-005 | W4 | Pending | Pending | Pending | Pending |
| BC-ALP-006 | W5 | Pending | Pending | Pending | Pending |
| BC-ALP-007 | W6 | Pending | Pending | Pending | Pending |
| BC-ALP-008 | W7 | Pending | Pending | Pending | Pending |
| BC-ALP-009 | W8 | Pending | Pending | Pending | Pending |
| BC-ALP-010 | W9 | Pending | Pending | Pending | Pending |

---

## 11. Stage 9 Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Builder checklist artifact exists | PASS | This file exists |
| Universal checks defined | PASS | Section 5 |
| Wave-specific checks defined | PASS | Section 6 |
| Dependency readiness checks defined | PASS | Section 7 |
| RED QA understanding checks defined | PASS | Section 8 |
| Protocol compliance checks defined | PASS | Section 9 |
| Role-fit decision matrix defined | PASS | Section 10 |
| Actual builders appointed | BLOCKED | Appointment occurs only at Stage 11 |
| Builder candidates passed checklist | BLOCKED | No candidates have acknowledged yet |
| Stage 10 may be prepared | PASS | Checklist structure is ready for IAA Pre-Brief preparation |
| Build authorized | NO | Build remains blocked |

---

## 12. Stage 9 Decision

```text
Stage 9 Builder Checklist: Draft PASS for Stage 10 IAA Pre-Brief preparation.
Builder Appointment: BLOCKED.
Build / Implementation: BLOCKED.
```

This artifact is complete as a checklist template and governance gate structure. It does not pass any individual builder candidate because no candidate acknowledgements or Foreman role-fit decisions have been recorded yet.

---

## 13. Proxy Sign-Off

I, ChatGPT acting as Product Owner / Foreman / Governance proxy at user request, record that this Stage 9 Builder Checklist defines the required builder-readiness, scope-alignment, RED QA understanding, dependency readiness, protocol compliance, and role-fit checks.

I do not authorize builder appointment or implementation.

---

## 14. Next Stage

Proceed to:

```text
modules/ALP/09-iaa-pre-brief/iaa-pre-brief.md
```

Build remains blocked.

---

## 15. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-11 | Initial Stage 9 Builder Checklist created after Stage 8 Implementation Plan merge. | ChatGPT acting as Product Owner / Foreman / Governance proxy | Draft PASS for Stage 10 preparation; builder appointment/build blocked |
