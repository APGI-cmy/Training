# APGI Learning Portal - Stage 3 Functional Requirements Specification

## Status Header

| Field | Value |
|---|---|
| Artifact | Functional Requirements Specification |
| Module | ALP - APGI Learning Portal |
| Stage | 3 - FRS |
| Version | 0.2 |
| Status | Draft - filed to clear WS-05 carry-forward path; approval remains pending |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/02-frs/functional-requirements.md |
| Prepared Date | 2026-06-15 |
| Prepared By | AI-assisted draft based on prior APGI Learning Portal FRS material and Stage 2 UX workflow wiring; requires Foreman/Product Owner/Governance review |
| Upstream Stage 2 | modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md |
| Downstream Stage 4 | modules/ALP/03-trs/technical-requirements-specification.md |
| Requirement Registry | modules/ALP/REQUIREMENT_REGISTRY.md |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This Stage 3 Functional Requirements Specification defines the functional behavior required for the APGI Learning Portal V1.

It is filed to resolve the WS-05 carry-forward gap for the Stage 3 FRS at the QA-enforced module path.

This artifact reconciles to the Stage 2 UX Workflow & Wiring Spec and does not authorize builder appointment, build, or implementation.

---

## 2. Scope

The APGI Learning Portal V1 is an APGI-owned LMS for delivering APGI learning products through controlled learner, reviewer, admin, reporting, and governance workflows.

In scope:

- learner access and enrolment;
- learner profile and certificate identity data;
- learner dashboard;
- course shell and learning-unit navigation;
- external URL-module unit viewing;
- progress and completion tracking;
- summative assessment submission;
- AI-supported assessment evaluation through the AIMC Gateway;
- human review and final assessment decisioning;
- certificate eligibility and generation;
- admin learner/course/enrolment/payment/assessment/certificate/report/audit functions;
- privacy, access control, audit, and CWT evidence obligations.

Out of scope unless separately authorized:

- SCORM/cmi5 runtime;
- xAPI/LRS;
- LTI/QTI/Open Badges;
- native mobile/offline app;
- public learner profile publishing;
- multi-tenant white-labeling;
- learner-facing AI tutor;
- discussion forums or messaging.

---

## 3. Functional Requirement Groups

| Group ID | Requirement Area | UX Source | Status |
|---|---|---|---|
| FR-ALP-AUTH | Access, roles, and protected routes | UJ-ALP-001, UJ-ALP-016 | Defined |
| FR-ALP-ENROL | Invitation, payment, and admin enrolment | UJ-ALP-001..003, UJ-ALP-018 | Defined |
| FR-ALP-PROFILE | Learner profile and certificate identity | UJ-ALP-004 | Defined |
| FR-ALP-DASH | Learner dashboard | UJ-ALP-005 | Defined |
| FR-ALP-COURSE | Course shell and unit navigation | UJ-ALP-006..009, UJ-ALP-017 | Defined |
| FR-ALP-ASSESS | Assessment submission, AI evaluation, human review, retake | UJ-ALP-010..013, UJ-ALP-019 | Defined |
| FR-ALP-CERT | Certificate eligibility and generation | UJ-ALP-014, UJ-ALP-020 | Defined |
| FR-ALP-ADMIN | Admin operations | UJ-ALP-003, UJ-ALP-015 | Defined |
| FR-ALP-REPORT | Reports and audit | UJ-ALP-015 | Defined |
| FR-ALP-GOV | Evidence, governance, and build-blocking controls | Stage 2, WS-05 | Defined |

---

## 4. Access, Roles, and Protected Routes

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-AUTH-001 | The system shall require authenticated access for learner, reviewer, admin, and governance routes. | Must | Unauthenticated access to protected areas is denied with a safe message. |
| FR-ALP-AUTH-002 | The system shall support learner, reviewer, admin, and governance/admin-equivalent role boundaries. | Must | Users only see and act on routes permitted by their role. |
| FR-ALP-AUTH-003 | The system shall prevent cross-learner data access. | Must | A learner cannot view another learner's profile, progress, assessment, files, or certificate. |
| FR-ALP-AUTH-004 | The system shall provide safe denied-access and expired-session states. | Must | Denied and expired states do not expose private data. |
| FR-ALP-AUTH-005 | The system shall record relevant access, admin, assessment, certificate, and report events for audit where required. | Should | Audit events are available to authorized admin/governance users. |

---

## 5. Enrolment Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-ENROL-001 | The system shall support invitation-based enrolment. | Must | A valid invitation can be accepted and converted into learner course access. |
| FR-ALP-ENROL-002 | The system shall reject invalid, expired, revoked, or mismatched invitation states. | Must | The learner receives a safe error state and no enrolment is created. |
| FR-ALP-ENROL-003 | The system shall support paid self-enrolment. | Must | Verified payment creates the correct learner enrolment. |
| FR-ALP-ENROL-004 | The system shall handle pending, failed, cancelled, and duplicate payment events. | Must | Enrolment state remains accurate and duplicate events do not duplicate enrolments. |
| FR-ALP-ENROL-005 | The system shall support admin-created learner enrolment. | Must | Authorized admin can create enrolment and the action is auditable. |
| FR-ALP-ENROL-006 | The system shall prevent duplicate active enrolments for the same learner/course pair unless explicitly allowed. | Must | Duplicate creation attempt is rejected or safely ignored. |

---

## 6. Learner Profile Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-PROFILE-001 | The system shall capture learner profile data required for LMS use and certificates. | Must | Required profile fields can be saved and validated. |
| FR-ALP-PROFILE-002 | The system shall indicate whether profile data is complete, incomplete, or needs update. | Must | Dashboard/course/certificate screens reflect profile status. |
| FR-ALP-PROFILE-003 | The system shall support learner profile media or document requirements where configured. | Should | Allowed media/document entries can be associated with the learner profile. |
| FR-ALP-PROFILE-004 | The system shall keep learner profile media private unless expressly authorized. | Must | Cross-learner access is denied. |

---

## 7. Dashboard Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-DASH-001 | The system shall show enrolled courses to the learner. | Must | Active enrolments appear as course cards. |
| FR-ALP-DASH-002 | Course cards shall show course status, progress, and next action. | Must | Learner can identify whether to continue learning, complete profile, submit assessment, or download certificate. |
| FR-ALP-DASH-003 | The dashboard shall support empty, loading, error, active, pending, and completed states. | Must | Each state has a safe learner-facing message. |
| FR-ALP-DASH-004 | The dashboard shall not show unauthorized or inactive courses as active learning cards. | Must | Only permitted courses are visible as active. |

---

## 8. Course Shell and Learning Unit Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-COURSE-001 | The system shall provide a course shell for enrolled learners. | Must | Enrolled learner can open the course shell from the dashboard. |
| FR-ALP-COURSE-002 | The course shell shall show modules, units, progress, and locked/unlocked states. | Must | Learner can navigate permitted units and see locked units. |
| FR-ALP-COURSE-003 | The system shall support read-only external URL-module units. | Must | Learner can launch configured external content and return to the course shell. |
| FR-ALP-COURSE-004 | External unit loading failure shall be recoverable. | Must | Learner sees a safe failure state and can retry or return. |
| FR-ALP-COURSE-005 | Unit completion shall update unit, module, course, and dashboard progress. | Must | Completion state persists and is reflected across learner views. |
| FR-ALP-COURSE-006 | Assessment unlock shall depend on configured progress/completion prerequisites. | Must | Assessment is locked before prerequisites and available afterward. |

---

## 9. Assessment and Review Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-ASSESS-001 | The system shall allow eligible learners to submit summative assessment evidence. | Must | Submission is accepted only when eligibility and required fields are satisfied. |
| FR-ALP-ASSESS-002 | The system shall block assessment access before prerequisites are met. | Must | Learner receives a clear locked state. |
| FR-ALP-ASSESS-003 | Submitted assessments shall move to evaluation state. | Must | Submission status changes from draft/available to submitted/evaluation. |
| FR-ALP-ASSESS-004 | The system shall route AI-supported evaluation through the AIMC Gateway. | Must | Assessment receives AI result, review-required state, or recoverable failure state. |
| FR-ALP-ASSESS-005 | AI failure or low-confidence evaluation shall not silently pass or fail the learner. | Must | The assessment is routed to recoverable or human-review-required state. |
| FR-ALP-ASSESS-006 | Human reviewers shall be able to finalize assessment decisions. | Must | Reviewer can record final pass/fail/review decision and learner-visible feedback. |
| FR-ALP-ASSESS-007 | The system shall support retake eligibility and retake blocking. | Must | Failed learner sees whether retake is available or blocked by policy. |

---

## 10. Certificate Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-CERT-001 | The system shall determine certificate eligibility from course completion, assessment outcome, and required profile data. | Must | Certificate remains locked until all conditions are met. |
| FR-ALP-CERT-002 | The system shall generate a certificate only for eligible learners. | Must | Pre-eligibility generation is blocked. |
| FR-ALP-CERT-003 | Learner shall be able to access generated certificate from the certificate screen. | Must | Eligible learner can view/download generated certificate. |
| FR-ALP-CERT-004 | Certificate generation and access shall be auditable where required. | Should | Authorized admin/governance user can inspect certificate activity. |

---

## 11. Admin Operations Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-ADMIN-001 | Admin shall be able to view and manage learner records. | Must | Authorized admin can list, search, and inspect learners. |
| FR-ALP-ADMIN-002 | Admin shall be able to view and manage course structure metadata. | Must | Authorized admin can inspect courses/modules/units. |
| FR-ALP-ADMIN-003 | Admin shall be able to create manual enrolments. | Must | Manual enrolment creates learner course access and audit evidence. |
| FR-ALP-ADMIN-004 | Admin shall be able to review payment status and reconciliation information. | Should | Payment state is visible without exposing secret values. |
| FR-ALP-ADMIN-005 | Reviewer/admin shall be able to review pending assessments. | Must | Review queue shows pending/review-required items. |
| FR-ALP-ADMIN-006 | Admin shall be able to inspect certificate status. | Should | Generated/pending/failed status is visible to authorized admin. |

---

## 12. Reporting and Audit Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-REPORT-001 | The system shall provide learner progress reporting. | Must | Authorized admin can view learner progress by course. |
| FR-ALP-REPORT-002 | The system shall provide course completion reporting. | Must | Authorized admin can view completion summary and learner list. |
| FR-ALP-REPORT-003 | The system shall provide assessment reporting. | Must | Authorized admin can view pending/reviewed/pass/fail summary. |
| FR-ALP-REPORT-004 | The system shall provide certificate reporting. | Should | Authorized admin can view generated/pending/failed certificate status. |
| FR-ALP-REPORT-005 | The system shall provide payment status reporting. | Should | Authorized admin can view paid/failed/pending/reconciled statuses. |
| FR-ALP-REPORT-006 | The system shall provide audit reporting. | Must | Authorized admin/governance user can inspect relevant events. |

---

## 13. Privacy, Security, and Reliability Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-GOV-001 | The system shall avoid exposing private learner information to unauthorized users. | Must | Negative access tests demonstrate denial. |
| FR-ALP-GOV-002 | Error states shall be safe and recoverable where possible. | Must | Learner/admin sees safe recovery guidance. |
| FR-ALP-GOV-003 | External content failure shall not break the LMS course shell. | Must | Unit viewer failure keeps navigation available. |
| FR-ALP-GOV-004 | Payment handling shall be idempotent. | Must | Duplicate payment event does not create duplicate enrolment. |
| FR-ALP-GOV-005 | AIMC Gateway failure shall enter review/recoverable state. | Must | No silent pass/fail on AI failure. |
| FR-ALP-GOV-006 | Certificate generation shall be blocked before eligibility. | Must | Pre-eligibility attempt is rejected. |
| FR-ALP-GOV-007 | Build remains blocked until later governance stages explicitly authorize it. | Must | FRS does not authorize implementation. |

---

## 14. UX-to-FRS Traceability

| UX Journey | Functional Requirement Coverage |
|---|---|
| UJ-ALP-001 | FR-ALP-AUTH-001..005, FR-ALP-ENROL-001..002, FR-ALP-DASH-001..004 |
| UJ-ALP-002 | FR-ALP-ENROL-003..004, FR-ALP-DASH-001..004 |
| UJ-ALP-003 | FR-ALP-ENROL-005..006, FR-ALP-ADMIN-001..003 |
| UJ-ALP-004 | FR-ALP-PROFILE-001..004 |
| UJ-ALP-005 | FR-ALP-DASH-001..004 |
| UJ-ALP-006 | FR-ALP-COURSE-001..002 |
| UJ-ALP-007 | FR-ALP-COURSE-003..004 |
| UJ-ALP-008 | FR-ALP-COURSE-005 |
| UJ-ALP-009 | FR-ALP-COURSE-006, FR-ALP-ASSESS-002 |
| UJ-ALP-010 | FR-ALP-ASSESS-001..003 |
| UJ-ALP-011 | FR-ALP-ASSESS-004..005 |
| UJ-ALP-012 | FR-ALP-ASSESS-006 |
| UJ-ALP-013 | FR-ALP-ASSESS-007 |
| UJ-ALP-014 | FR-ALP-CERT-001..004 |
| UJ-ALP-015 | FR-ALP-REPORT-001..006, FR-ALP-ADMIN-001..006 |
| UJ-ALP-016 | FR-ALP-AUTH-001..004, FR-ALP-GOV-001 |
| UJ-ALP-017 | FR-ALP-COURSE-004, FR-ALP-GOV-003 |
| UJ-ALP-018 | FR-ALP-ENROL-004, FR-ALP-GOV-004 |
| UJ-ALP-019 | FR-ALP-ASSESS-005, FR-ALP-GOV-005 |
| UJ-ALP-020 | FR-ALP-CERT-001..002, FR-ALP-GOV-006 |

---

## 15. Stage 3 Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Stage 3 artifact exists at QA-enforced path | PASS when merged | This file |
| Functional requirement groups defined | PASS | Section 3 |
| Access/enrolment/profile requirements defined | PASS | Sections 4-6 |
| Course/progress/assessment/certificate requirements defined | PASS | Sections 7-10 |
| Admin/report/audit requirements defined | PASS | Sections 11-12 |
| Privacy/security/reliability requirements defined | PASS | Section 13 |
| UX-to-FRS traceability defined | PASS | Section 14 |
| Human Product Owner / Governance approval | PENDING | Required before approval state |
| Build authorized | NO | Pre-build remediation still incomplete |

---

## 16. Stage 3 Decision

```text
Stage 3 Functional Requirements Specification: FILED FOR REVIEW.
WS-05 Carry-Forward Item CF-ALP-002: READY TO CLEAR when merged.
Builder Appointment: BLOCKED.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

This artifact clears the missing-file condition for Stage 3 at the canonical module path. It does not clear downstream Stage 4-5 or registry blockers.

---

## 17. Drafting Note (AI-assisted)

This Functional Requirements Specification was drafted with AI assistance at user request and is filed for review.
It does not constitute final Product Owner, Foreman, or Governance approval.

---

## 18. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-08 | Original FRS baseline drafted for the APGI Learning Portal. | AI-assisted draft | Pending |
| 0.2 | 2026-06-15 | Filed canonical Stage 3 module artifact to resolve WS-05 carry-forward missing-path item and reconcile with Stage 2 UX wiring. | AI-assisted draft (pending Foreman/Product Owner review) | Filed for review; build remains blocked |
