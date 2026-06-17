# APGI Learning Portal - WS-08 Golden Path Verification Pack

## Status Header

| Field | Value |
|---|---|
| Artifact | Golden Path Verification Pack |
| Module | ALP - APGI Learning Portal |
| Workstream | WS-08 - Golden Path Verification Pack |
| Version | 0.1 |
| Status | Draft - filed for governance review |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/11-build/golden-path-verification-pack.md |
| Prepared Date | 2026-06-16 |
| Prepared By | AI-assisted draft based on filed ALP Stage 2-6 artifacts, WS-06 QA range confirmation, and WS-07 runtime deployment contract; requires Foreman/Governance/QA review |
| Derived From | Stage 2 UX v0.3; Stage 3 FRS v0.2; Stage 4 TRS v0.3; Stage 5 Architecture v0.2; Requirement Registry v0.3; WS-06 QA-ALP Range Status Confirmation v0.2; WS-07 Runtime / Deployment Contract v0.1 |
| QA Range | QA-ALP-001 through QA-ALP-700 |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This WS-08 Golden Path Verification Pack defines the required browser-verifiable golden paths, negative paths, role paths, evidence expectations, and pass/fail criteria for future ALP build verification.

It is a pre-build evidence contract. It does not execute the paths, claim GREEN status, approve test results, appoint a builder, authorize build, or authorize implementation.

---

## 2. Verification Scope

The Golden Path Verification Pack covers:

- public entry and authentication path;
- invited learner enrolment path;
- paid learner enrolment path;
- admin manual enrolment path;
- learner dashboard and course shell path;
- external URL unit launch and safe failure path;
- progress and assessment unlock path;
- assessment submission and evidence upload path;
- AIMC evaluation and human review fallback path;
- certificate eligibility and generation path;
- admin reporting, audit, and export path;
- negative access and cross-learner denial paths;
- deployment, protected preview, and CWT evidence expectations.

---

## 3. Verification Environments

| Environment | Verification Use | Status |
|---|---|---|
| Local | Developer smoke only; not final CWT evidence unless explicitly approved | Allowed only after build authorization |
| Preview | Primary PR/build-wave CWT evidence environment | Allowed only after build authorization |
| Protected Preview | Acceptable if access/share mechanism is recorded and controlled | Allowed only after build authorization |
| Production | Final verification only after build authorization and promotion approval | Blocked until final authorization |

No route, screenshot, deployed URL, or CWT evidence may be used to claim completion before build authorization and actual implementation evidence exist.

---

## 4. Required Test Identities

| Identity | Role | Purpose | Data Constraint |
|---|---|---|---|
| ALP_TEST_LEARNER_INVITED | Learner | Invite/enrolment/dashboard/course/certificate path | Test-only non-personal data |
| ALP_TEST_LEARNER_PAID | Learner | Payment and paid enrolment path | Test-only non-personal data |
| ALP_TEST_REVIEWER | Reviewer | Assessment review queue and final review path | Test-only non-personal data |
| ALP_TEST_ADMIN | Admin | Manual enrolment, reports, audit, certificate admin path | Test-only non-personal data |
| ALP_TEST_UNAUTHORIZED | Unprivileged/unauthorized user | Negative access and denied-path checks | Test-only non-personal data |

Actual identity creation remains blocked until build authorization.

---

## 5. Golden Path Matrix

| Path ID | Golden Path | Primary Actors | Required Evidence | Linked QA Markers |
|---|---|---|---|---|
| GP-ALP-001 | Invite acceptance, authentication, profile completion, dashboard access | Invited learner | URL, screenshot/video, state proof, audit entry | QA-ALP-001..020, QA-ALP-066..080 |
| GP-ALP-002 | Paid checkout initiation, verified event intake, paid enrolment activation | Paid learner, payment event | pending/paid state proof, event audit, duplicate event proof | QA-ALP-066..080, QA-ALP-526..565 |
| GP-ALP-003 | Admin manual enrolment | Admin, learner | admin action proof, enrolment state, audit proof | QA-ALP-001..020, QA-ALP-526..565 |
| GP-ALP-004 | Dashboard course card and course shell navigation | Learner | dashboard screenshot, route proof, course shell proof | QA-ALP-211..250 |
| GP-ALP-005 | External URL learning unit launch and recoverable failure | Learner | successful launch proof and failed external content state proof | QA-ALP-211..250 |
| GP-ALP-006 | Unit progress update and assessment unlock | Learner | progress state proof, locked/unlocked transition proof | QA-ALP-211..250, QA-ALP-291..340 |
| GP-ALP-007 | Assessment submission with evidence upload | Learner | submission proof, evidence reference proof, private storage proof | QA-ALP-291..340 |
| GP-ALP-008 | AIMC evaluation via gateway and review fallback | Learner, reviewer | gateway success/failure proof, review-required state proof | QA-ALP-341 |
| GP-ALP-009 | Human review queue and reviewer final decision | Reviewer | review queue proof, decision proof, learner result proof | QA-ALP-381 |
| GP-ALP-010 | Certificate eligibility and generation | Learner, admin | eligibility proof, generated certificate proof, pre-eligibility block proof | QA-ALP-416..450 |
| GP-ALP-011 | Admin reports, exports, and audit review | Admin/governance | report screen, export proof, audit proof | QA-ALP-526..565 |
| GP-ALP-012 | Deployment and CWT smoke path | Admin/governance | preview URL, health proof, route smoke evidence, protected access record | QA-ALP-636..700 |

---

## 6. Negative Path Matrix

| Path ID | Negative Path | Required Result | Required Evidence |
|---|---|---|---|
| NP-ALP-001 | Unauthenticated user opens learner dashboard | Access denied or redirect to auth | Route screenshot and status proof |
| NP-ALP-002 | Learner attempts another learner private material | Denied; no private data exposure | Route/action proof and audit/log evidence |
| NP-ALP-003 | Learner attempts admin route | Denied | Route screenshot and access-control proof |
| NP-ALP-004 | Assessment submitted before prerequisite completion | Blocked | UI/server proof |
| NP-ALP-005 | Certificate generated before eligibility | Blocked and auditable | UI/server/audit proof |
| NP-ALP-006 | Duplicate payment event received | No duplicate enrolment | payment event state proof |
| NP-ALP-007 | AIMC gateway unavailable or malformed response | Recoverable/review-required state | error/fallback proof |
| NP-ALP-008 | External URL unit unavailable | Recoverable failure state | UI proof |

---

## 7. Evidence Requirements

Each future golden-path execution must include:

- environment name;
- deployed URL or preview URL;
- test identity used;
- timestamp;
- route/path exercised;
- expected result;
- actual result;
- screenshot, video, log excerpt, or test output as appropriate;
- linked QA marker(s);
- pass/fail outcome;
- unresolved defect reference if failed.

Evidence must not include secrets, real learner personal data, private learner artifacts, payment secrets, gateway keys, signing secrets, or uncontrolled public links to private material.

---

## 8. Minimum CWT Route Set

| Route Area | Minimum Evidence |
|---|---|
| Public/auth entry | login/register/invite acceptance path proof |
| Learner dashboard | enrolled course card proof |
| Course shell | module/unit navigation proof |
| Assessment | eligibility, submission, result/review state proof |
| Reviewer | review queue and decision proof |
| Certificate | eligibility and generated certificate proof |
| Admin | learner/enrolment/payment/report/audit proof |
| Negative access | protected route denied proof |
| Deployment | preview/protected-preview access proof |

Final exact routes remain implementation-specific and must be recorded in Stage 12 evidence once build is authorized.

---

## 9. Pass / Fail Criteria

| Criterion | PASS Requirement |
|---|---|
| Route evidence | Every required route/path has verifiable evidence. |
| Role correctness | Each role can access only authorized routes/actions. |
| Data privacy | No learner-private material is exposed publicly. |
| Payment safety | No paid enrolment activates from client-only redirect or unverified event. |
| AIMC safety | Gateway failure does not silently pass/fail learner. |
| Certificate safety | Certificate requires eligibility and blocks pre-eligibility generation. |
| Auditability | Material admin/payment/review/certificate actions are traceable. |
| CWT evidence | Browser-verifiable evidence is captured and linked to QA markers. |
| Defects | No unresolved P0/P1 issue may remain for final closure. |

---

## 10. Remaining Governance Blockers

| Blocker ID | Blocker | Required Resolution |
|---|---|---|
| WS08-ALP-BLOCK-001 | WS-09 build tracker not yet accepted on main | Merge/accept WS-09 tracker and keep it current before build starts. |
| WS08-ALP-BLOCK-002 | Evidence folder convention not confirmed | Complete WS-10 before build starts. |
| WS08-ALP-BLOCK-003 | Stage 9 builder checklist PASS evidence for named builders not complete | Complete before builder appointment. |
| WS08-ALP-BLOCK-004 | Stage 10 IAA acknowledgements for named builders not complete | Complete before builder appointment. |
| WS08-ALP-BLOCK-005 | Assurance/advisory recording not complete | Complete before builder appointment. |
| WS08-ALP-BLOCK-006 | Stage 11 actual builder appointment not complete | Complete before Stage 12 build authorization. |
| WS08-ALP-BLOCK-007 | Final Stage 12 build authorization not issued | Complete only after all prior blockers clear. |

---

## 11. Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Golden paths identified | PASS | Section 5. |
| Negative paths identified | PASS | Section 6. |
| Evidence requirements defined | PASS | Section 7. |
| CWT route set defined | PASS | Section 8. |
| Pass/fail criteria defined | PASS | Section 9. |
| Remaining blockers preserved | PASS | Section 10. |
| Human Governance/QA approval | PENDING | Required before approval state. |
| Build authorized | NO | Pre-build remediation still incomplete. |

---

## 12. WS-08 Decision

```text
WS-08 Golden Path Verification Pack: FILED FOR REVIEW.
Golden path verification evidence contract: DEFINED FOR REVIEW.
WS-09 Build Tracker Initialization: NEXT.
Builder Appointment: BLOCKED.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

---

## 13. Drafting Note (AI-assisted)

This Golden Path Verification Pack was drafted with AI assistance at user request and is filed for review.
It does not constitute final Foreman, Product Owner, Technical, Architecture, QA, or Governance approval.

---

## 14. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-16 | Filed WS-08 Golden Path Verification Pack for ALP. | AI-assisted draft (pending Foreman/Governance/QA review) | Filed for review; build remains blocked |
