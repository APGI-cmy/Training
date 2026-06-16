# APGI Learning Portal - Stage 5 Architecture v0.2

## Status Header

| Field | Value |
|---|---|
| Artifact | Architecture |
| Module | ALP - APGI Learning Portal |
| Stage | 5 - Architecture |
| Version | 0.2 |
| Status | Draft - filed to clear WS-05 carry-forward path; approval remains pending |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/04-architecture/architecture.md |
| Prepared Date | 2026-06-15 |
| Prepared By | AI-assisted draft based on Stage 2 UX, Stage 3 FRS, and Stage 4 TRS; requires Foreman/Governance architecture review |
| Derived From | Stage 2 UX Workflow & Wiring Spec v0.3; Stage 3 FRS v0.2; Stage 4 TRS v0.3 |
| Upstream Stage 2 | modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md |
| Upstream Stage 3 | modules/ALP/02-frs/functional-requirements.md |
| Upstream Stage 4 | modules/ALP/03-trs/technical-requirements-specification.md |
| Requirement Registry | modules/ALP/REQUIREMENT_REGISTRY.md |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This Stage 5 Architecture artifact defines the target APGI Learning Portal V1 architecture at a governance and implementation-planning level.

It is filed to resolve the WS-05 carry-forward gap for the Stage 5 Architecture v0.2 artifact at the QA-enforced module path.

This artifact is derived from Stage 2 UX Workflow & Wiring Spec v0.3, Stage 3 Functional Requirements Specification v0.2, and Stage 4 Technical Requirements Specification v0.3.

This artifact does not authorize builder appointment, build, or implementation.

---

## 2. Architecture Scope

The architecture covers:

- application route/module boundaries;
- learner, reviewer, admin, and governance role boundaries;
- domain data boundaries;
- storage and privacy boundaries;
- payment-event handling boundaries;
- AIMC Gateway integration boundaries;
- assessment, review, and certificate flow boundaries;
- reporting and audit boundaries;
- test/evidence and deployment-readiness boundaries;
- known blockers that must remain unresolved until later remediation workstreams.

Out of scope unless separately authorized:

- SCORM/cmi5 runtime architecture;
- xAPI/LRS architecture;
- LTI/QTI/Open Badges architecture;
- native mobile/offline architecture;
- learner-facing AI tutor architecture;
- multi-tenant white-label architecture.

---

## 3. Architectural Principles

| Principle ID | Principle | Required Effect |
|---|---|---|
| ARC-ALP-001 | Governance-first progression | Architecture may be filed, but no build may start until later authorization gates pass. |
| ARC-ALP-002 | Role/ownership isolation | Learner-private, reviewer, admin, and governance functions must remain permission-bound. |
| ARC-ALP-003 | Server-side enforcement | Protected reads/writes and privileged flows must be enforced server-side. |
| ARC-ALP-004 | Recoverable external dependencies | Payment, external URL content, AIMC, and certificate failures must enter recoverable or review states. |
| ARC-ALP-005 | Idempotent event handling | Payment and completion events must not duplicate or corrupt learner state. |
| ARC-ALP-006 | Evidence-driven closure | Build waves may only close later with executable tests and CWT evidence. |
| ARC-ALP-007 | Minimum necessary exposure | Learner private material must not be public by default. |
| ARC-ALP-008 | Traceability | Architecture must remain traceable to Stage 2 UX, Stage 3 FRS, and Stage 4 TRS. |

---

## 4. Logical Application Architecture

| Layer | Responsibility | Notes |
|---|---|---|
| Presentation / Routes | Learner dashboard, course shell, unit viewer, assessment, certificate, admin, review, reports, audit screens | Must reflect role, state, locked/unlocked, error, and empty states. |
| Server Operations | Protected mutations and reads for enrolment, progress, assessment, review, certificate, reporting, and audit | Must validate role and ownership before data access or mutation. |
| Domain Services | Business logic for enrolment, progress, assessment, AI routing, certificates, reports, and audit | Must centralize rules so UI cannot bypass gate logic. |
| Persistence | Durable records for learners, courses, enrolments, progress, assessments, AI evaluations, certificates, payment events, and audit events | Must support traceability and idempotency. |
| Private Storage | Learner profile media, assessment evidence, generated certificates where applicable | Must be private and role/ownership gated. |
| External Integrations | Existing URL-module content, payment provider, AIMC Gateway, certificate generation service where applicable | Must expose recoverable failure states. |
| QA / Evidence | RED-to-GREEN tests, governance artifact checks, CWT proof, deployment evidence | Must be attached to later build waves before closure. |

---

## 5. Route and Module Boundary Architecture

| Boundary | Routes / Screens | Primary Actors | Architectural Control |
|---|---|---|---|
| Public / Entry | invite acceptance, login/register, course purchase entry | learner/prospect | Safe public entry; no private data exposure. |
| Learner Dashboard | dashboard, course cards | learner | Enrolment-filtered learner-owned view. |
| Course Shell | course, module, unit navigation, unit viewer | learner | Enrolment and progress-gated access. |
| Assessment | eligibility, submission, result, retake | learner | Prerequisite-gated and stateful attempt handling. |
| Certificate | eligibility, generated certificate | learner | Completion/pass/profile-gated certificate access. |
| Reviewer | review queue, submission review, final decision | reviewer/admin | Reviewer role gate and assessment workflow state. |
| Admin Operations | learners, courses, enrolments, payments, certificates | admin | Admin role gate and audit side effects. |
| Reporting / Audit | reports, exports, audit log | admin/governance | Role-gated query/export access and audit trail. |

---

## 6. Domain Data Architecture

| Domain Object | Ownership / Access Boundary | Required Relationships |
|---|---|---|
| Learner profile | learner-owned; admin/governance/reviewer access only where authorized | enrolments, assessment submissions, certificates, private media |
| Course | admin-managed; learner-visible only via enrolment | modules, units, enrolments |
| Module | course-owned | ordered units |
| Unit | module-owned | progress, external URL metadata, completion rules |
| Enrolment | learner-course scoped | learner, course, origin, status |
| Invitation | invite scoped | learner/email target, course, status |
| Payment event | provider/admin reconciliation scoped | enrolment intent, status, idempotency key/event identity |
| Progress | learner-course-unit scoped | learner, unit, module/course completion state |
| Assessment submission | learner-course/assessment scoped | learner, evidence, AI evaluation, human review, outcome |
| AI evaluation | assessment scoped | request/response/failure/review-required state |
| Human review | assessment scoped | reviewer, decision, feedback, final outcome |
| Certificate | learner-course scoped | eligibility, generated artifact, audit state |
| Audit event | system/admin/learner scoped | actor, action, target, timestamp, metadata summary |

---

## 7. Storage and Privacy Architecture

| Storage Area | Contents | Privacy Control |
|---|---|---|
| Learner profile data | identity, certificate fields, learner-owned metadata | learner-owned; admin access only where authorized |
| Learner private media/document references | profile media/document artifacts | private by default; no public listing |
| Assessment evidence references | learner submissions and evidence references | learner/reviewer/admin gated |
| Certificate artifacts | generated certificates where applicable | learner-owned and admin/governance gated |
| Audit records | material actions and state changes | admin/governance gated |

Architectural rule: public routes may never directly expose learner private material, assessment evidence, or certificate artifacts without a valid role/ownership check.

---

## 8. Payment Event Architecture

Paid enrolment architecture must use verified event intake and idempotent reconciliation before granting access.

| Component | Responsibility |
|---|---|
| Checkout/session initiation | Begin paid enrolment attempt and create pending state. |
| Payment event intake | Receive provider event through a controlled server boundary. |
| Event verification | Verify event authenticity before persistence or enrolment activation. |
| Payment event persistence | Store event identity/status for audit and idempotency. |
| Payment reconciliation | Convert verified paid state into learner enrolment or retain pending/failed/cancelled state. |
| Idempotency handling | Ignore or safely reconcile duplicate events without duplicate enrolment. |
| Admin payment review | Show authorized payment status and reconciliation state without exposing secret values. |

No paid learner enrolment may become active solely from a client-side redirect or unverified event.

---

## 9. AIMC Gateway Architecture

Assessment AI evaluation must route through the AIMC Gateway boundary.

| Component | Responsibility |
|---|---|
| Assessment submission service | Prepares eligible assessment submission for evaluation. |
| AIMC Gateway adapter | Sends allowed assessment context through the approved gateway abstraction. |
| Evaluation persistence | Stores structured result, failure, confidence/review state, and audit summary. |
| Review fallback | Routes low-confidence, malformed, failed, or policy-exception states to human review or recoverable state. |
| Human review queue | Presents review-required items to authorized reviewers. |

Architectural rule: direct provider calls outside the AIMC Gateway are out of scope unless separately authorized.

---

## 10. Progress, Assessment, and Certificate Architecture

| Flow | Architectural Rule |
|---|---|
| Unit progress | Completion updates must be scoped to learner/course/unit and recalculated into module/course status. |
| Assessment unlock | Assessment availability must derive from configured prerequisite completion. |
| Assessment submission | Submission must be persisted before evaluation begins. |
| AI evaluation | Evaluation must never silently pass/fail when unavailable, malformed, or below review threshold. |
| Human review | Reviewer final decision must override or finalize provisional evaluation state where required. |
| Retake | Retake eligibility must derive from policy and current attempt state. |
| Certificate eligibility | Certificate generation must require course completion, pass outcome, and required learner identity/profile data. |
| Certificate generation | Pre-eligibility attempts must be blocked and auditable. |

---

## 11. Admin, Reporting, and Audit Architecture

| Area | Architectural Requirement |
|---|---|
| Learner admin | Admin view must support learner lookup and authorized detail inspection. |
| Course admin | Course/module/unit metadata must remain admin-managed. |
| Enrolment admin | Manual enrolment must be admin-gated and auditable. |
| Payment admin | Payment state must be inspectable without exposing secret values. |
| Assessment admin/review | Review queues must expose only authorized assessment records. |
| Certificate admin | Certificate status must be inspectable by authorized users. |
| Reports | Reports must be role-gated and filterable. |
| Exports | Exports must be controlled and auditable where required. |
| Audit | Material user/admin/system actions must be traceable. |

---

## 12. Test, Evidence, and CWT Architecture

| Evidence Area | Architectural Obligation |
|---|---|
| Governance artifact checks | Stage 1-6 artifact paths must pass QA governance checks. |
| Auth/security tests | Unauthorized access and cross-learner access denial must be proven. |
| Enrolment tests | Invitation, payment event, admin enrolment, and duplicate/idempotency states must be proven. |
| Course shell tests | Dashboard, navigation, locked state, unit launch, external failure must be proven. |
| Assessment tests | Eligibility, submission, AI success/failure, human review, pass/fail, retake must be proven. |
| Certificate tests | Locked, eligible, generated, and failed certificate states must be proven. |
| Reporting/audit tests | Authorized reports, exports, and audit views must be proven. |
| Deployment/CWT evidence | Browser-verifiable golden paths must be proven before any final CWT claim. |

This architecture does not replace Stage 6 QA-to-Red, Stage 8 implementation planning, WS-07 Runtime/Deployment Contract, or WS-08 Golden Path Verification Pack.

---

## 13. Runtime and Deployment Dependency

Runtime and deployment details remain intentionally blocked until WS-07 Runtime/Deployment Contract is filed.

Until WS-07 is filed, this architecture does not finalize:

- deployment target;
- environment variable names;
- secret names;
- seeded role/user fixtures;
- storage provider details;
- payment provider details;
- AIMC Gateway environment contract;
- certificate generation implementation service;
- health/readiness endpoints;
- production CWT URL.

---

## 14. Architecture-to-TRS Traceability

| TRS Group | Architecture Coverage |
|---|---|
| TR-ALP-AUTH | Route/module boundaries, role checks, server-side enforcement, privacy boundaries |
| TR-ALP-DATA | Domain data architecture and storage/privacy model |
| TR-ALP-COURSE | Course shell, unit viewer, progress, assessment unlock architecture |
| TR-ALP-PAY | Payment event intake, verification, reconciliation, idempotency architecture |
| TR-ALP-AIMC | AIMC Gateway adapter, evaluation persistence, review fallback architecture |
| TR-ALP-REVIEW | Human review queue and final decision architecture |
| TR-ALP-CERT | Eligibility and certificate artifact architecture |
| TR-ALP-ADMIN | Admin, reporting, payment review, audit architecture |
| TR-ALP-QA | Test/evidence/CWT architecture |
| TR-ALP-DEPLOY | Runtime/deployment dependency captured as WS-07 blocker |

---

## 15. Open Architecture Blockers

| Blocker ID | Blocker | Required Resolution |
|---|---|---|
| ARCH-ALP-BLOCK-001 | Requirement Registry still missing/unverified | File Requirement Registry at canonical path. |
| ARCH-ALP-BLOCK-002 | Runtime/Deployment Contract not filed | Complete WS-07 before build starts. |
| ARCH-ALP-BLOCK-003 | Golden Path Verification Pack not filed | Complete WS-08 before build starts. |
| ARCH-ALP-BLOCK-004 | Build tracker not initialized | Complete WS-09 before build starts. |
| ARCH-ALP-BLOCK-005 | Evidence folder convention not confirmed | Complete WS-10 before build starts. |
| ARCH-ALP-BLOCK-006 | Builder appointment remains blocked | Complete Stage 9, Stage 10, assurance/advisory, and Stage 11 prerequisites. |

---

## 16. Stage 5 Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Stage 5 artifact exists at QA-enforced path | PASS when merged | This file |
| Architecture v0.2 phrase present | PASS | Status header and title |
| Derived-from upstream versions recorded | PASS | Status header and Section 1 |
| Application architecture defined | PASS | Sections 4-5 |
| Data/storage/privacy architecture defined | PASS | Sections 6-7 |
| Payment event architecture defined | PASS | Section 8 |
| AIMC Gateway architecture defined | PASS | Section 9 |
| Assessment/certificate architecture defined | PASS | Section 10 |
| Admin/report/audit architecture defined | PASS | Section 11 |
| Test/evidence/CWT architecture defined | PASS | Section 12 |
| Runtime/deployment dependency recorded | PASS | Section 13 |
| TRS traceability defined | PASS | Section 14 |
| Human Architecture/Governance approval | PENDING | Required before approval state |
| Build authorized | NO | Pre-build remediation still incomplete |

---

## 17. Stage 5 Decision

```text
Stage 5 Architecture v0.2: FILED FOR REVIEW.
WS-05 Carry-Forward Item CF-ALP-004: READY TO CLEAR when merged.
Builder Appointment: BLOCKED.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

This artifact clears the missing-file condition for Stage 5 at the canonical module path. It does not clear the Requirement Registry blocker.

---

## 18. Drafting Note (AI-assisted)

This Architecture artifact was drafted with AI assistance at user request and is filed for review.
It does not constitute final Foreman, Architecture, Technical, or Governance approval.

---

## 19. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-08 | Original architecture baseline drafted for the APGI Learning Portal. | AI-assisted draft | Pending |
| 0.2 | 2026-06-15 | Filed canonical Stage 5 Architecture v0.2 module artifact to resolve WS-05 carry-forward missing-path item and reconcile with Stage 2 UX, Stage 3 FRS, and Stage 4 TRS. | AI-assisted draft (pending Foreman/Governance review) | Filed for review; build remains blocked |
