# APGI Learning Portal - Stage 8 QA and Traceability Resolution

## Purpose

This file resolves the two remaining PR #48 review comments.

It is binding alongside `implementation-plan.md` for Stage 8 review.

## Executable Stage 6 Suites

Only these Stage 6 test files currently exist and may be treated as executable closure gates:

- `governance-artifacts.spec.ts`
- `architecture-inventory.spec.ts`
- `auth.spec.ts`
- `course-shell.spec.ts`
- `assessment-submission.spec.ts`
- `certificate.spec.ts`
- `security-privacy.spec.ts`
- `deployment-cwt.spec.ts`

Any other suite name in the parent plan is a future expansion suite and must be created, committed, executed, and proven RED before it can be used as a wave closure gate.

## Corrected Wave QA Mapping

| Wave | Existing executable suites | Expansion suites before full closure if needed |
|---|---|---|
| W0 | governance-artifacts, architecture-inventory, deployment-cwt | none |
| W1 | auth, architecture-inventory, security-privacy, deployment-cwt | profile-files |
| W2 | architecture-inventory, course-shell, security-privacy | dashboard, accessibility |
| W3 | course-shell, architecture-inventory, security-privacy | progress-completion |
| W4 | architecture-inventory, security-privacy, deployment-cwt | invitation, payments, audit |
| W5 | assessment-submission, security-privacy, architecture-inventory | profile-files |
| W6 | assessment-submission, security-privacy, architecture-inventory | ai-evaluation, human-review, audit |
| W7 | certificate, security-privacy, architecture-inventory, deployment-cwt | audit |
| W8 | architecture-inventory, security-privacy, deployment-cwt | admin, reports, audit |
| W9 | deployment-cwt plus all executable regression suites | all expansion suites created in W1-W8 |

## Item-Level Traceability

| Wave | Item-level ownership | Executable QA coverage |
|---|---|---|
| W0 | TR-ALP-020, TR-ALP-021, TR-ALP-023; Architecture H1, H3, H4, H6, H10, H11 | QA-ALP-001-065; QA-ALP-636-660 |
| W1 | TR-ALP-001, TR-ALP-002, TR-ALP-006, TR-ALP-007, TR-ALP-017 | QA-ALP-066-080; QA-ALP-526-565 |
| W2 | TR-ALP-008, TR-ALP-009, TR-ALP-019 | QA-ALP-021-065; QA-ALP-211-222 |
| W3 | TR-ALP-010 | QA-ALP-021-065; QA-ALP-211-222 |
| W4 | TR-ALP-003, TR-ALP-004, TR-ALP-005, TR-ALP-018 | QA-ALP-021-065; QA-ALP-535; QA-ALP-643 |
| W5 | TR-ALP-011 | QA-ALP-291, QA-ALP-296, QA-ALP-297 |
| W6 | TR-ALP-012, TR-ALP-013, TR-ALP-018 | QA-ALP-341, QA-ALP-381 |
| W7 | TR-ALP-014, TR-ALP-018 | QA-ALP-416, QA-ALP-421, QA-ALP-424, QA-ALP-429 |
| W8 | TR-ALP-015, TR-ALP-016, TR-ALP-018 | QA-ALP-021-065; QA-ALP-526-565 |
| W9 | TR-ALP-019, TR-ALP-020, TR-ALP-021, TR-ALP-023 | QA-ALP-636-660 plus all regression suites |

## Gate Interpretation

Stage 8 remains a preparation artifact. It passes for Stage 9 preparation only.

Builder appointment and build remain blocked.

## Resolution

The PR #48 comments about executable QA suite mapping and item-level traceability are resolved by this addendum.
