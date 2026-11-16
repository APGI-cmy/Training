# APGI Learning Portal - Stage 4 Technical Requirements Specification

## Status Header

| Field | Value |
|---|---|
| Artifact | Technical Requirements Specification |
| Module | ALP - APGI Learning Portal |
| Stage | 4 - TRS |
| Version | 0.3 |
| Status | Draft - filed to clear WS-05 carry-forward path; approval remains pending |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/03-trs/technical-requirements-specification.md |
| Prepared Date | 2026-06-15 |
| Prepared By | AI-assisted draft based on Stage 2 UX and Stage 3 FRS; requires Foreman/Governance technical review |
| Derived From | Stage 2 UX Workflow & Wiring Spec v0.3 and Stage 3 Functional Requirements Specification v0.2 |
| Upstream Stage 2 | modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md |
| Upstream Stage 3 | modules/ALP/02-frs/functional-requirements.md |
| Downstream Stage 5 | modules/ALP/04-architecture/architecture.md |
| Requirement Registry | modules/ALP/REQUIREMENT_REGISTRY.md |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This Stage 4 Technical Requirements Specification defines the technical behavior, system boundaries, data contracts, integration points, test obligations, and deployment constraints required to implement the APGI Learning Portal V1 later.

It is filed to resolve the WS-05 carry-forward gap for the Stage 4 TRS at the QA-enforced module path.

This artifact is derived from the Stage 2 UX Workflow & Wiring Spec v0.3 and Stage 3 Functional Requirements Specification v0.2. It does not authorize builder appointment, build, or implementation.

---

## 2. Technical Scope

The ALP V1 technical scope covers:

- protected application routes and role-aware access;
- learner invitation, paid enrolment, and admin enrolment flows;
- learner profile and private learner media/document handling;
- dashboard/course-shell/unit-viewer behavior;
- progress/completion state management;
- assessment submission and evidence handling;
- AIMC Gateway-mediated AI evaluation;
- human review and final assessment outcomes;
- certificate eligibility and certificate artifact handling;
- admin reporting, audit, and operational screens;
- deployment, runtime, test, evidence, and CWT-readiness obligations.

Out of technical scope unless separately authorized:

- SCORM/cmi5 runtime engine;
- xAPI/LRS;
- LTI/QTI/Open Badges;
- native offline/mobile application;
- learner-facing AI tutor;
- multi-tenant white-label runtime.

---

## 3. Technical Requirement Groups

| Group ID | Requirement Area | FRS Source | Status |
|---|---|---|---|
| TR-ALP-AUTH | Authentication, authorization, and protected routes | FR-ALP-AUTH | Defined |
| TR-ALP-DATA | Data model and persistence boundaries | FR-ALP-ENROL, FR-ALP-PROFILE, FR-ALP-COURSE, FR-ALP-ASSESS, FR-ALP-CERT | Defined |
| TR-ALP-COURSE | Course shell, unit viewer, and progress logic | FR-ALP-COURSE | Defined |
| TR-ALP-PAY | Payment event handling and idempotency | FR-ALP-ENROL, FR-ALP-GOV | Defined |
| TR-ALP-AIMC | AIMC Gateway evaluation integration | FR-ALP-ASSESS, FR-ALP-GOV | Defined |
| TR-ALP-REVIEW | Human review and assessment decisioning | FR-ALP-ASSESS | Defined |
| TR-ALP-CERT | Certificate eligibility and artifact handling | FR-ALP-CERT | Defined |
| TR-ALP-ADMIN | Admin, reporting, and audit | FR-ALP-ADMIN, FR-ALP-REPORT | Defined |
| TR-ALP-QA | Tests, CWT, and evidence | Stage 6 QA-to-Red, Stage 8 plan | Defined |
| TR-ALP-DEPLOY | Runtime, deployment, and environment contract | WS-07 pending | Defined with blocker |

---

## 4. Application Boundary Requirements

| Requirement ID | Technical Requirement | Priority | Verification |
|---|---|---|---|
| TR-ALP-AUTH-001 | Protected learner, reviewer, admin, and governance routes shall enforce authenticated session state. | Must | Route access tests and negative access tests. |
| TR-ALP-AUTH-002 | Role checks shall prevent users from accessing screens or records outside their permission boundary. | Must | Role-matrix tests and manual CWT evidence. |
| TR-ALP-AUTH-003 | Unauthorized and expired-session paths shall return safe non-leaking states. | Must | Negative route proof. |
| TR-ALP-AUTH-004 | Server-side operations that read or mutate protected records shall validate role and ownership. | Must | Unit/integration tests for protected operations. |

---

## 5. Data Model Requirements

The implementation shall define durable records for at least the following concepts:

| Entity | Required Purpose | Notes |
|---|---|---|
| Learner profile | identity, certificate fields, learner-owned metadata | Must support complete/incomplete state. |
| Course | course metadata and publication state | Must support active/inactive states. |
| Module | course grouping of units | Must support ordered structure. |
| Unit | learning item, external URL-module metadata, completion rules | Must support locked/unlocked and external URL states. |
| Enrolment | learner-course relationship | Must support invitation, paid, and admin origins. |
| Invitation | invitation lifecycle | Must support valid, accepted, expired, revoked states. |
| Payment event | payment state and reconciliation evidence | Must support verified, pending, failed, cancelled, duplicate-ignored, and idempotent reconciliation states. |
| Progress | learner unit/module/course status | Must support recalculation and audit. |
| Assessment submission | assessment attempt and evidence state | Must support submitted, review, passed, failed, retake states. |
| AI evaluation | AIMC response and fallback state | Must support failed/review-required states. |
| Human review | reviewer decision and feedback | Must preserve final decision audit. |
| Certificate | eligibility and generated artifact state | Must support locked/generated/failed states. |
| Audit event | material admin/system/user events | Must support reporting and traceability. |

No implementation may store private learner material in a publicly accessible location unless separately authorized and documented.

---

## 6. Integration Requirements

| Integration | Technical Requirement | Failure Handling |
|---|---|---|
| Existing external URL-module content | Unit viewer shall launch configured trusted content and allow return to LMS shell. | Recoverable unit-viewer failure state. |
| Payment provider | Payment status shall be accepted only through verified provider events or authorized admin reconciliation. | Pending/failed/cancelled/duplicate states. |
| AIMC Gateway | Assessment evaluation shall route through the AIMC Gateway abstraction. | Recoverable/review-required state; no silent pass/fail. |
| Certificate generation | Certificate artifact generation shall require eligibility state. | Generation failure state, retry/admin review. |
| Reporting/export | Report and export flows shall enforce admin permission checks. | Safe denied state and audit where required. |

---

## 7. API / Server Operation Requirements

The implementation shall provide server-side operations or equivalent endpoints for:

| Operation Area | Required Operations |
|---|---|
| Auth/session | current user, role, protected-route validation |
| Invitation | validate invite, accept invite, revoke/expire handling |
| Enrolment | create from invitation, create from verified payment, create from admin, list learner enrolments |
| Payment events | receive provider event, verify event authenticity, persist payment event, reconcile payment state, handle pending/failed/cancelled/duplicate events, enforce idempotency before enrolment activation |
| Profile | read/update learner profile, record profile completion |
| Course | list learner courses, read course structure, read unit metadata |
| Progress | mark unit progress, recalculate course progress, read dashboard progress |
| Assessment | read eligibility, create submission, attach evidence reference, read result |
| AI evaluation | queue/send evaluation request through AIMC Gateway, persist response/failure/review state |
| Human review | list review queue, read submission, finalize decision |
| Certificate | calculate eligibility, generate certificate, retrieve learner certificate |
| Admin/reporting | learner/course/enrolment/payment/assessment/certificate/report/audit reads |

Every protected operation must define owner/role validation and failure behavior. Payment-event operations must not activate paid enrolment until the payment event has been verified and idempotently reconciled.

---

## 8. Test and Evidence Requirements

| Requirement ID | Test / Evidence Obligation | Required Before Closure |
|---|---|---|
| TR-ALP-QA-001 | Governance artifact existence checks shall pass for Stage 1-6 artifacts. | Before WS-05 closure. |
| TR-ALP-QA-002 | Auth and unauthorized access tests shall prove safe denial. | Before build-wave closure. |
| TR-ALP-QA-003 | Learner enrolment tests shall cover invitation, verified payment event intake, admin enrolment, pending/failed/cancelled payment states, and duplicate payment idempotency. | Before relevant wave closure. |
| TR-ALP-QA-004 | Course shell tests shall cover dashboard, navigation, locked state, unit launch, and external failure. | Before relevant wave closure. |
| TR-ALP-QA-005 | Assessment tests shall cover eligibility, submission, AI success, AI failure, human review, pass/fail, and retake. | Before relevant wave closure. |
| TR-ALP-QA-006 | Certificate tests shall cover locked, eligible, generated, and failed states. | Before relevant wave closure. |
| TR-ALP-QA-007 | Reporting/audit proof shall show authorized views and safe export behavior. | Before relevant wave closure. |
| TR-ALP-QA-008 | Deployment/CWT evidence shall prove browser-verifiable golden paths. | Before any final CWT claim. |

---

## 9. Runtime and Deployment Requirements

Runtime/deployment details remain pending WS-07 Runtime/Deployment Contract.

Until WS-07 is filed, implementation may not assume final values for:

- deployment target;
- environment variable names;
- secret names;
- seeded roles/users;
- storage provider details;
- payment provider configuration;
- AIMC Gateway environment contract;
- certificate generation service details;
- health/readiness checks.

This TRS defines technical requirement categories only. It does not define the final deployment contract.

---

## 10. Non-Functional Requirements

| Area | Technical Requirement |
|---|---|
| Security | Protected data must be denied by default unless role/ownership permits access. |
| Privacy | Learner private material must remain learner-owned and non-public by default. |
| Reliability | Recoverable failures must be visible and actionable. |
| Idempotency | Payment and completion duplicate events must not corrupt learner state. |
| Auditability | Material learner/admin/system events must be traceable. |
| Accessibility | Learner/admin screens must support keyboard navigation, labels, focus, validation, and meaningful error states. |
| Maintainability | Stage 4 implementation must remain traceable to Stage 2 UX and Stage 3 FRS. |
| Testability | Requirements must map to tests/evidence before build-wave closure. |

---

## 11. FRS-to-TRS Traceability

| FRS Group | Technical Requirement Coverage |
|---|---|
| FR-ALP-AUTH | TR-ALP-AUTH-001..004, TR-ALP-QA-002 |
| FR-ALP-ENROL | TR-ALP-DATA, TR-ALP-PAY, TR-ALP-QA-003 |
| FR-ALP-PROFILE | TR-ALP-DATA, TR-ALP-QA-002 |
| FR-ALP-DASH | TR-ALP-COURSE, TR-ALP-QA-004 |
| FR-ALP-COURSE | TR-ALP-COURSE, TR-ALP-QA-004 |
| FR-ALP-ASSESS | TR-ALP-AIMC, TR-ALP-REVIEW, TR-ALP-QA-005 |
| FR-ALP-CERT | TR-ALP-CERT, TR-ALP-QA-006 |
| FR-ALP-ADMIN | TR-ALP-ADMIN, TR-ALP-QA-007 |
| FR-ALP-REPORT | TR-ALP-ADMIN, TR-ALP-QA-007 |
| FR-ALP-GOV | TR-ALP-QA, TR-ALP-DEPLOY, TR-ALP-AUTH |

---

## 12. Open Technical Blockers

| Blocker ID | Blocker | Required Resolution |
|---|---|---|
| TRS-ALP-BLOCK-001 | Runtime/Deployment Contract not filed | Complete WS-07 before build starts. |
| TRS-ALP-BLOCK-002 | Golden Path Verification Pack not filed | Complete WS-08 before build starts. |
| TRS-ALP-BLOCK-003 | Build tracker not initialized | Complete WS-09 before build starts. |
| TRS-ALP-BLOCK-004 | Evidence folder convention not confirmed | Complete WS-10 before build starts. |
| TRS-ALP-BLOCK-005 | Stage 5 Architecture v0.2 still missing/unverified | File Stage 5 Architecture at canonical path. |
| TRS-ALP-BLOCK-006 | Requirement Registry still missing/unverified | File Requirement Registry at canonical path. |
| TRS-ALP-BLOCK-007 | Builder appointment remains blocked | Complete Stage 9, Stage 10, assurance/advisory, and Stage 11 prerequisites. |

---

## 13. Stage 4 Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Stage 4 artifact exists at QA-enforced path | PASS when merged | This file |
| Technical requirement groups defined | PASS | Section 3 |
| Application boundaries defined | PASS | Section 4 |
| Data model requirements defined | PASS | Section 5 |
| Integration requirements defined | PASS | Section 6 |
| Server operation requirements defined | PASS | Section 7 |
| Test/evidence obligations defined | PASS | Section 8 |
| Runtime/deployment dependency recorded | PASS | Section 9 |
| FRS-to-TRS traceability defined | PASS | Section 11 |
| Human Technical/Governance approval | PENDING | Required before approval state |
| Build authorized | NO | Pre-build remediation still incomplete |

---

## 14. Stage 4 Decision

```text
Stage 4 Technical Requirements Specification: FILED FOR REVIEW.
WS-05 Carry-Forward Item CF-ALP-003: READY TO CLEAR when merged.
Builder Appointment: BLOCKED.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

This artifact clears the missing-file condition for Stage 4 at the canonical module path. It does not clear downstream Stage 5 or registry blockers.

---

## 15. Drafting Note (AI-assisted)

This Technical Requirements Specification was drafted with AI assistance at user request and is filed for review.
It does not constitute final Foreman, Technical, or Governance approval.

---

## 16. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-08 | Original TRS baseline drafted for the APGI Learning Portal. | AI-assisted draft | Pending |
| 0.2 | 2026-06-15 | Filed canonical Stage 4 module artifact to resolve WS-05 carry-forward missing-path item and reconcile with Stage 2 UX and Stage 3 FRS. | AI-assisted draft (pending Foreman/Governance review) | Filed for review; build remains blocked |
| 0.3 | 2026-06-15 | Added explicit upstream derived-from versions and strengthened payment event intake, verification, reconciliation, and idempotency requirements. | AI-assisted draft (pending Foreman/Governance review) | Filed for review; build remains blocked |
