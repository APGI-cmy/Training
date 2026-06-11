# APGI Learning Portal - Stage 11 Builder Appointment

## Status Header

| Field | Value |
|---|---|
| Artifact | Builder Appointment Record |
| Module | ALP - APGI Learning Portal |
| Stage | 11 - Builder Appointment |
| Version | 0.1 |
| Status | Draft - Appointment record created; no builder appointed |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/10-builder-appointment/builder-appointment.md |
| Prepared Date | 2026-06-11 |
| Prepared By | ChatGPT acting as Product Owner / Foreman / Governance proxy at user request |
| Upstream Stage 10 | modules/ALP/09-iaa-pre-brief/iaa-pre-brief.md |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This Stage 11 artifact records the APGI Learning Portal builder appointment gate and the conditions required before any builder can be formally appointed.

It does not appoint a builder yet because Stage 9 and Stage 10 acknowledgements remain pending and no named builder candidates have been supplied.

This artifact prepares the appointment record structure so that a future Foreman appointment can be made only after all mandatory conditions are satisfied.

---

## 2. Canonical Authority

The Pre-Build Stage Model defines Stage 11 as the stage where approved builders may be appointed only after prior gates pass.

Mandatory Stage 11 conditions:

- all Stages 1-10 complete and gate-passed;
- Builder Checklist PASS for all appointed builders;
- IAA Pre-Brief acknowledged by all appointed builders;
- formal appointment issued by Foreman;
- appointment recorded in the module tracker.

Gate condition:

```text
Formal Foreman appointment issued and recorded in tracker.
```

---

## 3. Upstream Gate Status

| Gate | Required Status Before Appointment | Current Status | Appointment Impact |
|---|---|---|---|
| Stage 6 QA-to-Red | Filed and RED proof captured | Filed | Satisfied |
| Stage 7 PBFAG | Filed | Filed | Satisfied for planning |
| Stage 8 Implementation Plan | Filed | Filed | Satisfied for planning |
| Stage 8 QA/Traceability Resolution | Filed | Filed | Satisfied for planning |
| Stage 9 Builder Checklist | Builder candidates must pass | Checklist filed; candidate acknowledgement pending | Blocks appointment |
| Stage 9 Review Resolution | Filed | Filed | Satisfied for planning |
| Stage 10 IAA Pre-Brief | Foreman/builders acknowledged; ASSURANCE-TOKEN or PHASE_A_ADVISORY recorded | Artifact filed; acknowledgements/advisory pending | Blocks appointment |

---

## 4. Carry-Forward Appointment Blockers

The following blockers must be cleared or explicitly converted into signed Stage 11 conditions before appointment:

| Blocker ID | Blocker | Required Resolution |
|---|---|---|
| APPT-ALP-BLOCK-001 | Named builder candidates not supplied | identify builder or agent per appointed wave |
| APPT-ALP-BLOCK-002 | Builder agent contracts not linked | record current contract path per appointed builder |
| APPT-ALP-BLOCK-003 | Builder Checklist acknowledgements pending | complete Stage 9 acknowledgement rows for appointed builders |
| APPT-ALP-BLOCK-004 | IAA Pre-Brief acknowledgements pending | complete Stage 10 acknowledgement rows for Foreman and appointed builders |
| APPT-ALP-BLOCK-005 | ASSURANCE-TOKEN / PHASE_A_ADVISORY pending | record token/advisory status before appointment |
| APPT-ALP-BLOCK-006 | Stage 2 UX Workflow & Wiring Spec carry-forward verification | verify/file before appointment or record explicit appointment-blocking condition |
| APPT-ALP-BLOCK-007 | Stage 3 FRS carry-forward verification | verify/file before appointment or record explicit appointment-blocking condition |
| APPT-ALP-BLOCK-008 | Stage 4 TRS carry-forward verification | verify/file before appointment or record explicit appointment-blocking condition |
| APPT-ALP-BLOCK-009 | Stage 5 Architecture v0.2 carry-forward verification | verify/file before appointment or record explicit appointment-blocking condition |
| APPT-ALP-BLOCK-010 | Requirement Registry carry-forward verification | verify/file before appointment or record explicit appointment-blocking condition |
| APPT-ALP-BLOCK-011 | QA-ALP range acceptance | confirm module-local or canonical registration before appointment |
| APPT-ALP-BLOCK-012 | Runtime/Deployment Contract | required before first build wave |
| APPT-ALP-BLOCK-013 | Golden Path Verification Pack | required before first build wave |

---

## 5. Appointment Candidate Register

No candidate is appointed by this artifact. The following table is the appointment register to be completed before a future appointment can pass.

| Appointment ID | Candidate / Agent | Wave(s) | Required Role | Stage 9 Checklist PASS? | Stage 10 Acknowledged? | Foreman Appointment Decision |
|---|---|---|---|---|---|---|
| APPT-ALP-001 | To be assigned | W0 | Foundation / Platform Builder | Pending | Pending | Not appointed |
| APPT-ALP-002 | To be assigned | W1 | Auth / Data / Security Builder | Pending | Pending | Not appointed |
| APPT-ALP-003 | To be assigned | W2 | Learner UX Builder | Pending | Pending | Not appointed |
| APPT-ALP-004 | To be assigned | W3 | Progress / Completion Builder | Pending | Pending | Not appointed |
| APPT-ALP-005 | To be assigned | W4 | Payment / Enrolment Builder | Pending | Pending | Not appointed |
| APPT-ALP-006 | To be assigned | W5 | Assessment Builder | Pending | Pending | Not appointed |
| APPT-ALP-007 | To be assigned | W6 | AI / Review Builder | Pending | Pending | Not appointed |
| APPT-ALP-008 | To be assigned | W7 | Certificate Builder | Pending | Pending | Not appointed |
| APPT-ALP-009 | To be assigned | W8 | Admin / Reporting Builder | Pending | Pending | Not appointed |
| APPT-ALP-010 | To be assigned | W9 | Deployment / CWT Builder | Pending | Pending | Not appointed |

---

## 6. Formal Appointment Template

The following template must be completed before any builder is considered appointed.

```text
Foreman Appointment ID: APPT-ALP-___
Builder / Agent: <name or agent identifier>
Assigned Wave(s): <W#>
Assigned Role: <role>
Contract Reference: <path/link>
Stage 9 Checklist Result: PASS
Stage 10 IAA Pre-Brief Acknowledgement: PASS
ASSURANCE-TOKEN / PHASE_A_ADVISORY: <token/advisory reference>
Scope Boundary: <explicit wave scope>
RED QA Boundary: <assigned executable and expansion suites>
Evidence Boundary: <required evidence package>
Merge Gate Boundary: all required checks must pass
STOP-AND-FIX Acknowledgement: PASS
Foreman Decision: APPOINTED / NOT APPOINTED
Foreman Signature: <name/date>
```

No row may be marked APPOINTED unless every required field is complete.

---

## 7. Appointed Builder Obligations

Any future appointed builder must accept the following obligations:

- implement only assigned wave scope;
- use Stage 8 wave plan and Stage 8 QA/Traceability Resolution as the source of scope and QA boundaries;
- use Stage 9 Builder Checklist as the source of builder-readiness obligations;
- use Stage 10 IAA Pre-Brief as the source of task acceptance criteria;
- preserve all prior GREEN tests;
- create and prove any required expansion RED suite before implementing expanded scope;
- file required evidence before wave handover;
- stop at the first failing gate;
- never bypass merge gates;
- never treat CI green as functional proof without CWT/Golden Path evidence;
- never expose secrets, private learner files, or cross-learner data;
- never integrate direct AI provider calls outside the AIMC Gateway unless separately authorized.

---

## 8. Appointment Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Stage 11 artifact exists | PASS when merged | This file |
| Stage 1-10 chain referenced | PASS | Section 3 |
| Appointment blockers recorded | PASS | Section 4 |
| Appointment register provided | PASS | Section 5 |
| Formal appointment template provided | PASS | Section 6 |
| Builder obligations recorded | PASS | Section 7 |
| Named builders supplied | BLOCKED | No named builder candidates supplied |
| Stage 9 checklist PASS per builder | BLOCKED | Pending candidate acknowledgements |
| Stage 10 acknowledgement PASS per builder | BLOCKED | Pending candidate acknowledgements |
| ASSURANCE-TOKEN / PHASE_A_ADVISORY recorded | BLOCKED | Pending |
| Foreman appointment issued | BLOCKED | Must be issued in future update |
| Build authorized | NO | Stage 12 only |

---

## 9. Stage 11 Decision

```text
Stage 11 Builder Appointment Record: Draft PASS as appointment-record structure.
Formal Builder Appointment: BLOCKED.
Build / Implementation: BLOCKED.
```

This artifact is complete as a Stage 11 appointment record scaffold, but it does not appoint any builder. A future update must fill the appointment register with named builders and evidence before appointment can pass.

---

## 10. Proxy Sign-Off

I, ChatGPT acting as Product Owner / Foreman / Governance proxy at user request, record that this Stage 11 artifact defines the required appointment structure, appointment blockers, candidate register, appointment template, and appointed-builder obligations.

I do not appoint any builder and do not authorize implementation.

---

## 11. Next Stage

Formal Stage 12 Build Authorization may be prepared only after Stage 11 is updated with actual appointed builders and all appointment blockers are cleared.

Planned path:

```text
modules/ALP/11-build-authorization/build-authorization.md
```

Build remains blocked.

---

## 12. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-11 | Initial Stage 11 Builder Appointment record scaffold created after Stage 10 IAA Pre-Brief merge. | ChatGPT acting as Product Owner / Foreman / Governance proxy | Draft PASS as scaffold; no appointment/build authorization |
