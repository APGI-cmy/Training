# APGI Learning Portal - WS-10 Evidence Folder Convention

## Status Header

| Field | Value |
|---|---|
| Artifact | Evidence Folder Convention |
| Module | ALP - APGI Learning Portal |
| Workstream | WS-10 - Evidence Folder Convention |
| Version | 0.2 |
| Status | Draft - filed for governance review |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/11-build/evidence/README.md |
| Prepared Date | 2026-06-17 |
| Prepared By | AI-assisted draft based on filed ALP build-readiness remediation artifacts; requires Foreman/Governance/QA review |
| Derived From | WS-08 Golden Path Verification Pack; WS-09 Build Progress Tracker; WS-07 Runtime / Deployment Contract; WS-06 QA-ALP Range Status Confirmation; Stage 8 Implementation Plan; Stage 9 Builder Checklist |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This artifact defines the canonical evidence folder convention for future ALP build-wave evidence, CWT evidence, test output, screenshots, logs, traceability proofs, and closure records.

It satisfies WS-10 from the ALP build-readiness remediation flow by defining where evidence must be placed and how it must be named and linked before any future build wave can close.

This artifact does not create runtime evidence, execute CWT, authorize builder appointment, authorize build, or authorize implementation.

---

## 2. Evidence Root

The canonical ALP build evidence root is:

```text
modules/ALP/11-build/evidence/
```

This README is the convention file for the evidence root. The canonical roll-up evidence index is `modules/ALP/11-build/evidence/index.md`, which must be created before or during the first authorized build-wave evidence PR.

All future build-wave evidence must be filed under this root unless a later approved governance artifact explicitly changes the evidence location.

---

## 3. Required Folder Structure

Future evidence must use this structure, aligned to the existing Stage 8 implementation plan and Stage 9 builder checklist wave definitions:

```text
modules/ALP/11-build/evidence/
├── README.md
├── index.md
├── W0-foundation-scaffold/
├── W1-auth-profile-files/
├── W2-dashboard-course-shell/
├── W3-progress-completion/
├── W4-enrolment-payments/
├── W5-assessment-submission/
├── W6-ai-review/
├── W7-certificates/
├── W8-admin-reports-audit/
└── W9-deployment-cwt/
```

`index.md` must provide a roll-up table linking each evidence file to its wave, QA marker(s), PR, check status, and closure decision.

The wave folders above may remain absent until build is authorized and evidence is produced, but their names are reserved by this convention.

---

## 4. Wave Folder Contract

| Wave | Folder | Evidence Purpose |
|---|---|---|
| W0 | `W0-foundation-scaffold/` | Foundation/scaffold, tooling, environment, repo structure, base app shell, Supabase config skeleton, health/readiness evidence |
| W1 | `W1-auth-profile-files/` | Auth, roles, protected layouts, profile, private profile file upload, denied-path evidence |
| W2 | `W2-dashboard-course-shell/` | Learner dashboard, course cards, course shell, sidebar, read-only URL-module unit viewer evidence |
| W3 | `W3-progress-completion/` | Progress events, learner progress, module/course completion, next-action evidence |
| W4 | `W4-enrolment-payments/` | Invitation, manual enrolment, Stripe checkout/webhook/idempotency, payment audit evidence |
| W5 | `W5-assessment-submission/` | Assessment definitions, rubrics, attempts, written/evidence submission evidence |
| W6 | `W6-ai-review/` | AIMC Gateway adapter, AI states, reviewer queue, final outcomes evidence |
| W7 | `W7-certificates/` | Certificate eligibility, generation, storage, download, certificate event evidence |
| W8 | `W8-admin-reports-audit/` | Admin operations, reports, audit UI, report filter evidence |
| W9 | `W9-deployment-cwt/` | Deployed integrated LMS, CWT evidence package, preview URL proof, final proof |

---

## 5. Evidence File Naming Rules

Evidence files must use this naming pattern:

```text
<YYYYMMDD>-<wave>-<qa-marker-or-path-id>-<evidence-type>-<short-description>.<ext>
```

Examples:

```text
20260617-W1-QA-ALP-066-screenshot-learner-dashboard-denied.png
20260617-W5-GP-ALP-007-test-output-assessment-submission.md
20260617-W9-GP-ALP-012-cwt-preview-route-smoke.md
```

Approved evidence type tokens:

| Token | Meaning |
|---|---|
| `screenshot` | Static browser/UI screenshot |
| `video` | Browser/session recording |
| `test-output` | Test output, command result, or test summary |
| `log` | Sanitized runtime/build/application log excerpt |
| `cwt` | Click-walk-through evidence |
| `audit` | Audit trail proof |
| `report` | Report/export proof |
| `trace` | Traceability proof |
| `decision` | Review/approval/closure decision |

---

## 6. Evidence Index Requirements

`modules/ALP/11-build/evidence/index.md` must include this table when created:

| Wave | Evidence File | QA Marker(s) | Golden / Negative Path | Environment | PR / Commit | Check Status | Reviewer / Owner | Closure Status | Notes |
|---|---|---|---|---|---|---|---|---|---|

Every build-wave evidence PR must update both:

1. `modules/ALP/11-build/evidence/index.md`; and
2. `modules/ALP/BUILD_PROGRESS_TRACKER.md`.

The tracker must link to the evidence file(s) and reflect merge/check/blocker status for the affected W0-W9 row.

---

## 7. Environment and URL Recording Rules

Every CWT or deployed-environment evidence record must state:

- environment name;
- URL or protected preview URL reference;
- whether deployment is preview, protected preview, production, or local;
- access method used;
- timestamp;
- actor/test identity;
- route/path exercised;
- expected result;
- actual result;
- pass/fail state;
- unresolved issue link if failed.

Protected preview access links must not be recorded if they expose private or long-lived credentials. Record only the evidence-safe reference required to reproduce or audit the run.

---

## 8. Secret and Private Data Exclusion Rules

Evidence must never include:

- secret keys;
- service role keys;
- payment provider secrets;
- webhook signing secrets;
- AIMC Gateway API keys;
- certificate signing secrets;
- production learner personal data;
- private learner documents;
- uncontrolled public links to learner-private material;
- raw database URLs or connection strings;
- session cookies;
- bearer tokens;
- full auth headers.

If an evidence artifact accidentally includes prohibited material, it must not be merged. A redacted replacement must be produced before evidence can count toward closure.

---

## 9. Screenshot and Video Rules

Screenshots and videos must:

- show the route or state under test;
- avoid real personal data;
- use test identities only;
- avoid browser extensions or unrelated tabs when possible;
- avoid exposing auth/session tokens in URL bars or devtools;
- be linked from `index.md` and the tracker;
- include QA marker or path ID in the filename.

---

## 10. Test Output and Log Rules

Test output and log evidence must:

- include command or tool context when safe;
- include pass/fail summary;
- include relevant QA marker(s);
- be redacted for secrets and private data;
- avoid excessive raw logs when a concise evidence summary is sufficient;
- link to CI/check results when available.

---

## 11. Closure Requirements

No wave may close unless the evidence folder contains or links to:

- all required evidence for that wave;
- relevant QA markers;
- CWT or browser evidence where required by WS-08;
- test/check results where required;
- unresolved blocker/risk status;
- reviewer or governance disposition;
- updated `BUILD_PROGRESS_TRACKER.md` row.

Wave evidence may be incomplete, failed, or blocked, but it must be labeled honestly. Failed evidence must not be presented as closure evidence.

---

## 12. Current Status

```text
WS-10 Evidence Folder Convention: FILED FOR REVIEW.
Evidence folder convention: DEFINED FOR REVIEW.
Evidence artifacts: NOT YET PRODUCED.
Build waves W0-W9: BLOCKED.
Builder Appointment: BLOCKED.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

---

## 13. Remaining Governance Blockers

| Blocker ID | Blocker | Required Resolution |
|---|---|---|
| WS10-ALP-BLOCK-001 | Stage 9 named-builder PASS evidence incomplete | Complete before builder appointment. |
| WS10-ALP-BLOCK-002 | Stage 10 acknowledgements/advisory incomplete | Complete before builder appointment. |
| WS10-ALP-BLOCK-003 | Stage 11 actual builder appointment incomplete | Complete only after Stage 9/10/advisory prerequisites. |
| WS10-ALP-BLOCK-004 | Final Stage 12 build authorization missing | Complete only after all prior blockers clear. |
| WS10-ALP-BLOCK-005 | Build evidence not produced | Build evidence remains impossible until build is authorized. |

---

## 14. Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Evidence root defined | PASS | Section 2. |
| W0-W9 folder convention defined | PASS | Sections 3 and 4. |
| Evidence naming rules defined | PASS | Section 5. |
| Evidence index requirements defined | PASS | Section 6. |
| CWT URL/environment recording rules defined | PASS | Section 7. |
| Secret/private-data exclusions defined | PASS | Section 8. |
| Screenshot/video rules defined | PASS | Section 9. |
| Test output/log rules defined | PASS | Section 10. |
| Wave closure evidence rules defined | PASS | Section 11. |
| Wave mapping aligned to Stage 8/9 plan | PASS | Sections 3 and 4 use the existing W0-W9 wave definitions. |
| Human Governance/QA approval | PENDING | Required before approval state. |
| Build authorized | NO | Builder/build/implementation remain blocked. |

---

## 15. WS-10 Decision

```text
WS-10 Evidence Folder Convention: FILED FOR REVIEW.
WS-10 evidence convention: DEFINED FOR REVIEW.
Next governance blockers: Stage 9 named-builder PASS evidence, Stage 10 acknowledgements/advisory, Stage 11 appointment, final Stage 12 build authorization.
Builder Appointment: BLOCKED.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

---

## 16. Drafting Note (AI-assisted)

This Evidence Folder Convention was drafted with AI assistance at user request and is filed for review.
It does not constitute final Foreman, Product Owner, Technical, Architecture, QA, or Governance approval.

---

## 17. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-17 | Filed WS-10 Evidence Folder Convention for ALP. | AI-assisted draft (pending Foreman/Governance/QA review) | Filed for review; build remains blocked |
| 0.2 | 2026-06-17 | Clarified README vs index roles and aligned W0-W9 evidence folders to the existing Stage 8/9 wave plan. | AI-assisted draft (pending Foreman/Governance/QA review) | Filed for review; build remains blocked |
