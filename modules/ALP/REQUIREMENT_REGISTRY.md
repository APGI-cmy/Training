# APGI Learning Portal - Requirement Registry

## Status Header

| Field | Value |
|---|---|
| Artifact | Requirement Registry |
| Module | ALP - APGI Learning Portal |
| Stage Context | Cross-stage governance registry |
| Version | 0.2 |
| Status | Draft - filed to clear WS-05 carry-forward path; approval remains pending |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/REQUIREMENT_REGISTRY.md |
| Prepared Date | 2026-06-16 |
| Prepared By | AI-assisted draft based on filed ALP Stage 2-6 artifacts; requires Foreman/Governance review |
| Derived From | Stage 2 UX v0.3; Stage 3 FRS v0.2; Stage 4 TRS v0.3; Stage 5 Architecture v0.2; Stage 6 QA-to-Red |
| Stage 2 UX | modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md |
| Stage 3 FRS | modules/ALP/02-frs/functional-requirements.md |
| Stage 4 TRS | modules/ALP/03-trs/technical-requirements-specification.md |
| Stage 5 Architecture | modules/ALP/04-architecture/architecture.md |
| Stage 6 QA-to-Red | modules/ALP/05-qa-to-red/qa-to-red.md |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This Requirement Registry records the canonical cross-stage traceability spine for the APGI Learning Portal.

It is filed to resolve the WS-05 carry-forward gap for the Requirement Registry at the QA-enforced module path.

The registry links UX journey IDs, functional requirement IDs, technical requirement groups, architecture controls, and QA coverage markers so downstream work can trace build evidence back to approved governance artifacts.

This artifact does not authorize builder appointment, build, or implementation.

---

## 2. Registry Scope

The registry covers:

- Stage 2 UX journey IDs `UJ-ALP-001` through `UJ-ALP-020`;
- Stage 3 functional requirement IDs `FR-ALP-*`;
- Stage 4 technical requirement groups `TR-ALP-*`;
- Stage 5 architecture principle/control IDs `ARC-ALP-*` and architecture sections;
- Stage 6 QA markers `QA-ALP-*` where currently filed;
- governance blockers that remain open after the registry is filed.

The registry does not replace the source artifacts. The source artifacts remain authoritative for their own stage content.

---

## 3. Source Artifact Registry

| Source ID | Artifact | Canonical Path | Version / Status |
|---|---|---|---|
| SRC-ALP-001 | App Description | modules/ALP/00-app-description/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md | Filed |
| SRC-ALP-002 | Stage 2 UX Workflow & Wiring Spec | modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md | v0.3 filed for review |
| SRC-ALP-003 | Stage 3 Functional Requirements Specification | modules/ALP/02-frs/functional-requirements.md | v0.2 filed for review |
| SRC-ALP-004 | Stage 4 Technical Requirements Specification | modules/ALP/03-trs/technical-requirements-specification.md | v0.3 filed for review |
| SRC-ALP-005 | Stage 5 Architecture v0.2 | modules/ALP/04-architecture/architecture.md | v0.2 filed for review |
| SRC-ALP-006 | Stage 6 QA-to-Red | modules/ALP/05-qa-to-red/qa-to-red.md | Filed |
| SRC-ALP-007 | Stage 6 QA Catalog Alignment | modules/ALP/05-qa-to-red/qa-catalog-alignment.md | Filed; WS-06 final range status pending |
| SRC-ALP-008 | WS-05 Carry-Forward Artifact Verification | modules/ALP/11-build/carry-forward-artifact-verification.md | Filed with carry-forward blockers |

---

## 4. UX Journey Registry

| UX ID | Journey | Primary Requirement Group | QA / Evidence Direction |
|---|---|---|---|
| UJ-ALP-001 | Invited learner accepts invite, authenticates, completes profile, opens dashboard | FR-ALP-AUTH, FR-ALP-ENROL, FR-ALP-DASH | invite accept proof, dashboard proof |
| UJ-ALP-002 | Paid learner buys course and receives access after verified payment | FR-ALP-ENROL, FR-ALP-DASH | payment success/fail/idempotency proof |
| UJ-ALP-003 | Admin manually enrols learner | FR-ALP-ENROL, FR-ALP-ADMIN | manual enrolment and audit proof |
| UJ-ALP-004 | Learner completes certificate profile and profile media requirements | FR-ALP-PROFILE | profile completion and private media proof |
| UJ-ALP-005 | Learner opens dashboard and enrolled course cards | FR-ALP-DASH | dashboard state proof |
| UJ-ALP-006 | Learner opens course shell and navigates sidebar | FR-ALP-COURSE | course shell navigation proof |
| UJ-ALP-007 | Learner launches external URL-module learning unit | FR-ALP-COURSE | external launch proof |
| UJ-ALP-008 | Learner completes learning unit and progress updates | FR-ALP-COURSE | progress update proof |
| UJ-ALP-009 | Module completion unlocks summative assessment | FR-ALP-COURSE, FR-ALP-ASSESS | locked/unlocked proof |
| UJ-ALP-010 | Learner submits assessment evidence | FR-ALP-ASSESS | assessment submission proof |
| UJ-ALP-011 | AI evaluates assessment and returns result or review flag | FR-ALP-ASSESS | AI result/fallback proof |
| UJ-ALP-012 | Human reviewer finalizes assessment | FR-ALP-ASSESS | human review proof |
| UJ-ALP-013 | Learner fails assessment and retakes if eligible | FR-ALP-ASSESS | retake proof |
| UJ-ALP-014 | Learner passes course and generates certificate | FR-ALP-CERT | eligibility/generation proof |
| UJ-ALP-015 | Admin reviews learner reports | FR-ALP-ADMIN, FR-ALP-REPORT | report/export/audit proof |
| UJ-ALP-016 | Unauthorized user is denied restricted access | FR-ALP-AUTH, FR-ALP-GOV | unauthorized access denial proof |
| UJ-ALP-017 | External learning content fails safely | FR-ALP-COURSE, FR-ALP-GOV | recoverable external failure proof |
| UJ-ALP-018 | Duplicate payment event is handled idempotently | FR-ALP-ENROL, FR-ALP-GOV | duplicate payment idempotency proof |
| UJ-ALP-019 | AI gateway failure enters recoverable or review state | FR-ALP-ASSESS, FR-ALP-GOV | AIMC failure fallback proof |
| UJ-ALP-020 | Certificate generation before eligibility is blocked | FR-ALP-CERT, FR-ALP-GOV | pre-eligibility block proof |

---

## 5. Functional Requirement Group Registry

| FR Group | Requirement Area | UX Coverage | Technical Coverage | Architecture Coverage |
|---|---|---|---|---|
| FR-ALP-AUTH | Access, roles, and protected routes | UJ-ALP-001, UJ-ALP-016 | TR-ALP-AUTH | ARC-ALP-002, ARC-ALP-003, ARC-ALP-007 |
| FR-ALP-ENROL | Invitation, payment, and admin enrolment | UJ-ALP-001..003, UJ-ALP-018 | TR-ALP-DATA, TR-ALP-PAY | ARC-ALP-004, ARC-ALP-005 |
| FR-ALP-PROFILE | Learner profile and certificate identity | UJ-ALP-004 | TR-ALP-DATA | ARC-ALP-002, ARC-ALP-007 |
| FR-ALP-DASH | Learner dashboard | UJ-ALP-005 | TR-ALP-COURSE | ARC-ALP-002, ARC-ALP-008 |
| FR-ALP-COURSE | Course shell and unit navigation | UJ-ALP-006..009, UJ-ALP-017 | TR-ALP-COURSE | ARC-ALP-004, ARC-ALP-006 |
| FR-ALP-ASSESS | Assessment submission, AI evaluation, review, retake | UJ-ALP-010..013, UJ-ALP-019 | TR-ALP-AIMC, TR-ALP-REVIEW | ARC-ALP-004, ARC-ALP-006, ARC-ALP-008 |
| FR-ALP-CERT | Certificate eligibility and generation | UJ-ALP-014, UJ-ALP-020 | TR-ALP-CERT | ARC-ALP-003, ARC-ALP-007 |
| FR-ALP-ADMIN | Admin operations | UJ-ALP-003, UJ-ALP-015 | TR-ALP-ADMIN | ARC-ALP-002, ARC-ALP-003 |
| FR-ALP-REPORT | Reports and audit | UJ-ALP-015 | TR-ALP-ADMIN | ARC-ALP-006, ARC-ALP-008 |
| FR-ALP-GOV | Evidence, governance, and build-blocking controls | UJ-ALP-016..020, WS-05 | TR-ALP-QA, TR-ALP-DEPLOY | ARC-ALP-001, ARC-ALP-006, ARC-ALP-008 |

---

## 6. Technical Requirement Group Registry

| TR Group | Requirement Area | FRS Source | Architecture Coverage | QA Direction |
|---|---|---|---|---|
| TR-ALP-AUTH | Authentication, authorization, protected routes | FR-ALP-AUTH | Route/module boundaries; role checks; server-side enforcement | Auth and unauthorized access tests |
| TR-ALP-DATA | Data model and persistence boundaries | FR-ALP-ENROL, FR-ALP-PROFILE, FR-ALP-COURSE, FR-ALP-ASSESS, FR-ALP-CERT | Domain data architecture; storage/privacy model | Data-state and ownership proof |
| TR-ALP-COURSE | Course shell, unit viewer, progress logic | FR-ALP-DASH, FR-ALP-COURSE | Course shell, unit viewer, progress, assessment unlock | Course shell and external failure tests |
| TR-ALP-PAY | Payment event handling and idempotency | FR-ALP-ENROL, FR-ALP-GOV | Payment event intake, verification, reconciliation, idempotency | Payment event and duplicate-state tests |
| TR-ALP-AIMC | AIMC Gateway evaluation integration | FR-ALP-ASSESS, FR-ALP-GOV | AIMC Gateway adapter and evaluation persistence | AI success/failure/fallback tests |
| TR-ALP-REVIEW | Human review and assessment decisioning | FR-ALP-ASSESS | Human review queue and final decision architecture | Human review proof |
| TR-ALP-CERT | Certificate eligibility and artifact handling | FR-ALP-CERT | Eligibility and certificate artifact architecture | Certificate locked/generated/failed tests |
| TR-ALP-ADMIN | Admin, reporting, and audit | FR-ALP-ADMIN, FR-ALP-REPORT | Admin/report/audit architecture | Authorized report/export/audit proof |
| TR-ALP-QA | Tests, CWT, and evidence | FR-ALP-GOV | Test/evidence/CWT architecture | Stage 6 QA-to-Red and CWT evidence |
| TR-ALP-DEPLOY | Runtime, deployment, and environment contract | FR-ALP-GOV | Runtime/deployment dependency captured as WS-07 blocker | WS-07 deployment contract and CWT proof |

---

## 7. Architecture Principle Registry

| Architecture ID | Principle | Requirement Coverage |
|---|---|---|
| ARC-ALP-001 | Governance-first progression | FR-ALP-GOV, TR-ALP-QA, TR-ALP-DEPLOY |
| ARC-ALP-002 | Role/ownership isolation | FR-ALP-AUTH, FR-ALP-PROFILE, FR-ALP-ADMIN |
| ARC-ALP-003 | Server-side enforcement | FR-ALP-AUTH, FR-ALP-CERT, TR-ALP-AUTH |
| ARC-ALP-004 | Recoverable external dependencies | FR-ALP-COURSE, FR-ALP-ASSESS, TR-ALP-AIMC, TR-ALP-PAY |
| ARC-ALP-005 | Idempotent event handling | FR-ALP-ENROL, TR-ALP-PAY |
| ARC-ALP-006 | Evidence-driven closure | FR-ALP-GOV, TR-ALP-QA |
| ARC-ALP-007 | Minimum necessary exposure | FR-ALP-AUTH, FR-ALP-PROFILE, FR-ALP-CERT |
| ARC-ALP-008 | Traceability | Stage 2, Stage 3, Stage 4, Stage 5, Stage 6 |

---

## 8. QA Marker Registry

| QA Marker | Source / Path | Registry Meaning | Current Status |
|---|---|---|---|
| QA-ALP-001 | tests/qa-to-red/alp/governance-artifacts.spec.ts | App description exists | Expected to pass when source path exists |
| QA-ALP-002 | tests/qa-to-red/alp/governance-artifacts.spec.ts | UX workflow and wiring spec exists | Expected to pass after PR #56 merge |
| QA-ALP-003 | tests/qa-to-red/alp/governance-artifacts.spec.ts | FRS exists | Expected to pass after PR #57 merge |
| QA-ALP-005 | tests/qa-to-red/alp/governance-artifacts.spec.ts | TRS exists | Expected to pass after PR #58 merge |
| QA-ALP-006 | tests/qa-to-red/alp/governance-artifacts.spec.ts | Architecture v0.2 exists and includes phrase | Expected to pass after PR #59 merge |
| QA-ALP-008 | tests/qa-to-red/alp/governance-artifacts.spec.ts | Requirement Registry exists | Expected to pass when this file is merged |
| QA-ALP-009 | tests/qa-to-red/alp/governance-artifacts.spec.ts | QA-to-Red specification exists | Filed |
| QA-ALP-010 | tests/qa-to-red/alp/governance-artifacts.spec.ts | Build remains blocked | Filed through QA-to-Red status |
| QA-ALP-015 | tests/qa-to-red/alp/governance-artifacts.spec.ts | QA catalog alignment exists | Filed; WS-06 confirmation pending |

---

## 9. WS-05 Carry-Forward Closure Matrix

| WS-05 Item | Artifact | Canonical Path | Registry Status |
|---|---|---|---|
| CF-ALP-001 | Stage 2 UX Workflow & Wiring Spec | modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md | Filed |
| CF-ALP-002 | Stage 3 FRS | modules/ALP/02-frs/functional-requirements.md | Filed |
| CF-ALP-003 | Stage 4 TRS | modules/ALP/03-trs/technical-requirements-specification.md | Filed |
| CF-ALP-004 | Stage 5 Architecture v0.2 | modules/ALP/04-architecture/architecture.md | Filed |
| CF-ALP-005 | Requirement Registry | modules/ALP/REQUIREMENT_REGISTRY.md | Ready to clear when this file is merged |
| CF-ALP-006 | QA-ALP Range Status | modules/ALP/05-qa-to-red/qa-catalog-alignment.md | Partial; WS-06 pending |

---

## 10. Remaining Governance Blockers

| Blocker ID | Blocker | Required Resolution |
|---|---|---|
| REG-ALP-BLOCK-001 | WS-06 QA-ALP Range Status not complete | Confirm module-local acceptance or canonical registration. |
| REG-ALP-BLOCK-002 | Runtime/Deployment Contract not filed | Complete WS-07 before build starts. |
| REG-ALP-BLOCK-003 | Golden Path Verification Pack not filed | Complete WS-08 before build starts. |
| REG-ALP-BLOCK-004 | Build tracker not initialized | Complete WS-09 before build starts. |
| REG-ALP-BLOCK-005 | Evidence folder convention not confirmed | Complete WS-10 before build starts. |
| REG-ALP-BLOCK-006 | Stage 9 builder checklist PASS evidence for named builders not complete | Complete before builder appointment. |
| REG-ALP-BLOCK-007 | Stage 10 IAA acknowledgements for named builders not complete | Complete before builder appointment. |
| REG-ALP-BLOCK-008 | Assurance/advisory recording not complete | Complete before builder appointment. |
| REG-ALP-BLOCK-009 | Stage 11 actual builder appointment not complete | Complete before Stage 12 build authorization. |
| REG-ALP-BLOCK-010 | Final Stage 12 build authorization not issued | Complete only after all prior blockers clear. |

---

## 11. Registry Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Requirement Registry exists at QA-enforced path | PASS when merged | This file |
| Source artifacts registered | PASS | Section 3 |
| UX journeys registered | PASS | Section 4 |
| Functional requirement groups registered | PASS | Section 5 |
| Technical requirement groups registered | PASS | Section 6 |
| Architecture principles registered | PASS | Section 7 |
| QA markers registered | PASS | Section 8 |
| WS-05 carry-forward closure matrix included | PASS | Section 9 |
| Remaining blockers preserved | PASS | Section 10 |
| Human Governance approval | PENDING | Required before approval state |
| Build authorized | NO | Pre-build remediation still incomplete |

---

## 12. Registry Decision

```text
Requirement Registry: FILED FOR REVIEW.
WS-05 Carry-Forward Item CF-ALP-005: READY TO CLEAR when merged.
Builder Appointment: BLOCKED.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

This artifact clears the missing-file condition for the Requirement Registry at the canonical module path. It does not complete WS-06 QA-ALP Range Status and does not authorize build.

---

## 13. Drafting Note (AI-assisted)

This Requirement Registry was drafted with AI assistance at user request and is filed for review.
It does not constitute final Foreman, Product Owner, Technical, Architecture, or Governance approval.

---

## 14. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-08 | Original APGI Learning Portal requirement registry baseline drafted. | AI-assisted draft | Pending |
| 0.2 | 2026-06-16 | Filed canonical Requirement Registry artifact to resolve WS-05 carry-forward missing-path item and register Stage 2-6 traceability. | AI-assisted draft (pending Foreman/Governance review) | Filed for review; build remains blocked |
