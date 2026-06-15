# APGI Learning Portal - Stage 2 UX Workflow & Wiring Spec

## Status Header

| Field | Value |
|---|---|
| Artifact | UX Workflow & Wiring Spec |
| Module | ALP - APGI Learning Portal |
| Stage | 2 - UX Workflow & Wiring Spec |
| Version | 0.2 |
| Status | Draft - filed to clear WS-05 carry-forward path; approval remains pending |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md |
| Prepared Date | 2026-06-15 |
| Prepared By | AI-assisted draft based on prior APGI Learning Portal UX workflow specification material; requires Foreman/Product Owner/Governance review |
| Upstream Stage 1 | modules/ALP/00-app-description/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md |
| Downstream Stage 3 | modules/ALP/02-frs/functional-requirements.md |
| Requirement Registry | modules/ALP/REQUIREMENT_REGISTRY.md |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This Stage 2 artifact defines the user journeys, screen-level workflows, triggers, state transitions, reporting flows, and end-to-end wiring for the APGI Learning Portal V1.

It is filed to resolve the WS-05 carry-forward gap for the Stage 2 UX Workflow & Wiring Spec at the QA-enforced module path.

This artifact does not authorize builder appointment, build, or implementation.

---

## 2. Scope

The V1 UX scope is the APGI Core LMS for APGI-owned learning delivery.

In scope:

- learner sign-in and protected access;
- invitation enrolment;
- paid self-enrolment;
- manual/admin enrolment;
- learner profile and certificate identity capture;
- learner dashboard and course cards;
- course shell with module/unit sidebar;
- read-only external URL-module unit viewer;
- progress tracking and completion rules;
- summative assessment submission;
- AI-supported evaluation through the AIMC Gateway;
- human review;
- assessment result and retake flow;
- certificate eligibility and generation;
- admin learner/course/enrolment/payment/assessment/certificate/report/audit workflows;
- privacy, security, accessibility, reliability, and CWT-critical golden paths.

Out of scope unless separately authorized:

- SCORM/cmi5 runtime;
- xAPI/LRS;
- LTI/QTI/Open Badges;
- AI tutor or learner coach;
- mobile/offline app;
- public learner CV/profile publishing;
- multi-tenant white-labeling;
- discussion forums or messaging.

---

## 3. UX Delivery Rule

Every primary journey must have:

- an entry point;
- a success exit point;
- error exit points;
- screen transitions;
- user actions;
- system responses;
- data inputs and outputs;
- persisted state;
- audit or notification side effects where required;
- verification evidence before build-wave closure.

No primary user journey may be left to implementation interpretation.

---

## 4. User Journey Coverage Matrix

| Journey ID | Workflow | Primary Actor | CWT Required | Status |
|---|---|---|---|---|
| UJ-ALP-001 | Invited learner accepts invite, authenticates, completes profile, opens dashboard | Learner | Yes | Defined |
| UJ-ALP-002 | Paid learner buys course and receives access after verified payment | Learner | Yes | Defined |
| UJ-ALP-003 | Admin manually enrols learner | Admin | Yes | Defined |
| UJ-ALP-004 | Learner completes certificate profile and profile media requirements | Learner | Yes | Defined |
| UJ-ALP-005 | Learner opens dashboard and enrolled course cards | Learner | Yes | Defined |
| UJ-ALP-006 | Learner opens course shell and navigates sidebar | Learner | Yes | Defined |
| UJ-ALP-007 | Learner launches external URL-module learning unit | Learner | Yes | Defined |
| UJ-ALP-008 | Learner completes learning unit and progress updates | Learner/System | Yes | Defined |
| UJ-ALP-009 | Module completion unlocks summative assessment | Learner/System | Yes | Defined |
| UJ-ALP-010 | Learner submits assessment evidence | Learner | Yes | Defined |
| UJ-ALP-011 | AI evaluates assessment and returns result or review flag | AIMC/System | Yes | Defined |
| UJ-ALP-012 | Human reviewer finalizes assessment | Reviewer | Yes | Defined |
| UJ-ALP-013 | Learner fails assessment and retakes if eligible | Learner | Yes | Defined |
| UJ-ALP-014 | Learner passes course and generates certificate | Learner/System | Yes | Defined |
| UJ-ALP-015 | Admin reviews learner reports | Admin | Yes | Defined |
| UJ-ALP-016 | Unauthorized user is denied restricted access | User/System | Yes | Defined |
| UJ-ALP-017 | External learning content fails safely | Learner/System | Yes | Defined |
| UJ-ALP-018 | Duplicate payment event is handled idempotently | Payment/System | Yes | Defined |
| UJ-ALP-019 | AI gateway failure enters recoverable or review state | AIMC/System | Yes | Defined |
| UJ-ALP-020 | Certificate generation before eligibility is blocked | Learner/System | Yes | Defined |

---

## 5. Journey Wiring Summary

### Learner access and enrolment

Learner access begins through invitation, payment, or admin-created enrolment. The UX must route each learner through identity/profile completion before course access is considered fully ready. Course cards may appear as active, locked, pending-profile, pending-payment, complete, or error states.

### Course learning flow

The course shell must show the learner's enrolled course, module/unit navigation, locked and unlocked states, current progress, external URL-module launch actions, return-to-course actions, and completion feedback. External content failures must be recoverable and must not break the course shell.

### Assessment and review flow

Assessment unlocks only after prerequisite completion. The learner submits assessment evidence through a guided screen. The system then routes the assessment through AIMC-supported evaluation and, where required, human review. Result states must include pending, review needed, passed, failed, and retake eligible or blocked.

### Certificate flow

Certificate access is blocked until course completion, assessment pass, and required identity/profile data are complete. Certificate generation must expose generated, failed, locked, and downloadable states.

### Admin and reporting flow

Admin users need role-gated screens for learner management, course management, enrolment management, payment status review, assessment review, certificates, reports, and audit events. Reports must support progress, completion, assessment, certificate, payment, and audit views.

---

## 6. Screen Inventory

| Screen ID | Screen | Actor | Required States |
|---|---|---|---|
| SCR-ALP-001 | Invite Acceptance | Learner | loading, valid, expired, revoked, accepted |
| SCR-ALP-002 | Login/Register | Learner/Admin/Reviewer | unauthenticated, submitting, error, authenticated |
| SCR-ALP-003 | Profile | Learner | incomplete, saving, complete, validation error |
| SCR-ALP-004 | Dashboard | Learner | empty, active, pending profile, completed, error |
| SCR-ALP-005 | Course Shell | Learner | loading, active, locked, completed, error |
| SCR-ALP-006 | Unit Viewer | Learner | loading, loaded, failed, blocked |
| SCR-ALP-007 | Assessment | Learner | locked, available, draft, submitted, error |
| SCR-ALP-008 | Assessment Result | Learner | pending, passed, failed, review needed |
| SCR-ALP-009 | Certificate | Learner | locked, eligible, generated, failed |
| SCR-ALP-010 | Admin Learners | Admin | list, detail, create/edit, error |
| SCR-ALP-011 | Admin Courses | Admin | list, detail, create/edit, error |
| SCR-ALP-012 | Admin Payments | Admin | list, status, reconcile, error |
| SCR-ALP-013 | Review Queue | Reviewer/Admin | pending, in review, finalized, error |
| SCR-ALP-014 | Reports | Admin | dashboard, filters, export, error |
| SCR-ALP-015 | Audit | Admin/Governance | list, filters, detail, error |

---

## 7. Trigger Inventory

| Trigger ID | Trigger | Source | Target / Side Effect |
|---|---|---|---|
| TRG-ALP-001 | Invitation link opened | External message | invite validation |
| TRG-ALP-002 | Login/register submitted | Auth screen | session/user state |
| TRG-ALP-003 | Invitation accepted | Invite screen | enrolment and audit state |
| TRG-ALP-004 | Profile saved | Profile screen | learner profile update |
| TRG-ALP-005 | Profile media added | Profile screen | private learner media state |
| TRG-ALP-006 | Checkout started | Course purchase action | payment flow state |
| TRG-ALP-007 | Payment event received | Payment provider | payment/enrolment status update |
| TRG-ALP-008 | Unit launched | Course shell | launch/view event |
| TRG-ALP-009 | Unit completed | Course shell | progress update |
| TRG-ALP-010 | Assessment submitted | Assessment screen | submission/evaluation state |
| TRG-ALP-011 | AI evaluation completed | AIMC Gateway | result or review state |
| TRG-ALP-012 | Human review finalized | Review queue | final assessment state |
| TRG-ALP-013 | Certificate generated | Certificate screen/system | certificate state |
| TRG-ALP-014 | Report exported | Reports screen | export/audit event |

---

## 8. State Transition Model

| Entity | States |
|---|---|
| Invitation | created -> sent -> accepted / expired / revoked |
| Enrolment | pending -> active -> completed / cancelled |
| Profile | incomplete -> complete -> needs update |
| Payment | checkout_created -> pending -> paid / failed / cancelled / duplicate_ignored |
| Unit Progress | not_started -> in_progress -> completed |
| Course Progress | not_started -> in_progress -> complete |
| Assessment | locked -> available -> submitted -> ai_reviewed -> human_review_needed / passed / failed |
| Retake | not_required -> eligible -> used / exhausted / expired |
| Certificate | locked -> eligible -> generated -> downloadable / generation_failed |
| AI Evaluation | queued -> processing -> completed / failed / review_required |

---

## 9. AI Action Points

| AI Action ID | Point | Input | Output | Required Guardrail |
|---|---|---|---|
| AI-ALP-001 | Assessment evaluation | submission, rubric, learner/course metadata | score/recommendation/feedback/review flag | use AIMC Gateway only |
| AI-ALP-002 | Review escalation | low confidence or policy exception | human review state | no silent pass/fail |
| AI-ALP-003 | Feedback generation support | rubric and submission context | draft feedback | reviewer override/audit where applicable |

Direct calls to AI providers outside the AIMC Gateway are out of scope unless separately authorized.

---

## 10. Reporting and Admin Flows

| Report / Admin Flow | Required Inputs | Required Outputs |
|---|---|---|
| Learner progress report | learner, enrolment, progress | progress status, completion percentage, last activity |
| Course completion report | course, enrolments, completions | completion summary and learner list |
| Assessment report | submissions, AI/human results | pending/reviewed/pass/fail summary |
| Certificate report | certificates, eligibility | generated/pending/failed status |
| Payment report | payment events/enrolments | paid/failed/pending/reconciled status |
| Audit report | audit events | filterable event log |

Exports must be role-gated and must avoid exposing private learner files unless explicitly authorized.

---

## 11. End-to-End Wiring Matrix

| Journey | Screens | Triggers | State Transitions | QA Evidence Needed |
|---|---|---|---|---|
| UJ-ALP-001 | Invite, Auth, Profile, Dashboard | TRG-001..004 | Invitation, Profile, Enrolment | invite accept proof, dashboard proof |
| UJ-ALP-002 | Buy, Checkout, Dashboard | TRG-006..007 | Payment, Enrolment | payment success/fail/idempotency proof |
| UJ-ALP-003 | Admin Learners, Dashboard | TRG-003 | Enrolment | manual enrolment proof |
| UJ-ALP-004 | Profile | TRG-004..005 | Profile | private media proof |
| UJ-ALP-005 | Dashboard | TRG-004/009 | Enrolment, Course Progress | dashboard proof |
| UJ-ALP-006 | Course Shell | TRG-008..009 | Unit/Course Progress | navigation proof |
| UJ-ALP-007 | Unit Viewer | TRG-008 | Unit Progress | external load/failure proof |
| UJ-ALP-008 | Unit Viewer, Course Shell | TRG-009 | Unit/Course Progress | completion proof |
| UJ-ALP-009 | Course Shell, Assessment | TRG-009 | Assessment unlock | locked/unlocked proof |
| UJ-ALP-010 | Assessment | TRG-010 | Assessment | submission proof |
| UJ-ALP-011 | Assessment Result | TRG-011 | AI Evaluation, Assessment | AI success/failure proof |
| UJ-ALP-012 | Review Queue, Assessment Result | TRG-012 | Assessment | human review proof |
| UJ-ALP-013 | Result, Assessment | TRG-010/012 | Retake, Assessment | retake proof |
| UJ-ALP-014 | Certificate | TRG-013 | Certificate | eligibility/generation proof |
| UJ-ALP-015 | Reports, Audit | TRG-014 | Audit/export | report/export proof |

---

## 12. Governance Gaps and Carry-Forward Items

| Gap ID | Gap | Required Resolution |
|---|---|---|
| UX-ALP-GAP-001 | Product Owner approval pending | obtain human approval before marking approved |
| UX-ALP-GAP-002 | FRS reconciliation pending | reconcile Stage 3 FRS against this UX spec |
| UX-ALP-GAP-003 | TRS reconciliation pending | ensure endpoints/schema match UX trigger and state flows |
| UX-ALP-GAP-004 | Architecture reconciliation pending | ensure architecture supports storage, AIMC, payments, reporting, audit, and CWT flows |
| UX-ALP-GAP-005 | Build remains blocked | do not authorize implementation from this artifact |

---

## 13. Stage 2 Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Stage 2 artifact exists at QA-enforced path | PASS when merged | This file |
| User journey map defined | PASS | Section 4 and Section 5 |
| Screen inventory defined | PASS | Section 6 |
| Trigger inventory defined | PASS | Section 7 |
| State transitions defined | PASS | Section 8 |
| AI action points defined | PASS | Section 9 |
| Reports/admin flows defined | PASS | Section 10 |
| End-to-end wiring matrix defined | PASS | Section 11 |
| Human Product Owner approval | PENDING | Required before approval state |
| Build authorized | NO | Pre-build remediation still incomplete |

---

## 14. Stage 2 Decision

```text
Stage 2 UX Workflow & Wiring Spec: FILED FOR REVIEW.
WS-05 Carry-Forward Item CF-ALP-001: READY TO CLEAR when merged.
Builder Appointment: BLOCKED.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

This artifact clears the missing-file condition for Stage 2 at the canonical module path. It does not clear downstream Stage 3-5 or registry blockers.

---

## 15. Drafting Note (AI-assisted)

This UX Workflow & Wiring Spec was drafted with AI assistance at user request and is filed for review.
It does not constitute final Product Owner, Foreman, or Governance approval.

---

## 16. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-08 | Original detailed UX Workflow & Wiring Spec drafted from APGI Learning Portal app description and FRS baseline. | AI-assisted draft | Pending |
| 0.2 | 2026-06-15 | Filed governance-safe canonical Stage 2 module artifact to resolve WS-05 carry-forward missing-path item. | AI-assisted draft (pending Foreman/Product Owner review) | Filed for review; build remains blocked |
