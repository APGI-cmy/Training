# Independent IAA Pre-Brief Invocation Record — Batch 3 Lane A

## Status

| Field | Value |
|---|---|
| Module | ALP — APGI Learning Portal |
| Wave | Batch 3 Lane A stabilisation |
| Invocation date | 2026-07-28 |
| Wave checklist | `.agent-admin/waves/wave-batch3-lane-a-current-tasks.md` |
| PBFAG | `modules/ALP/06-pbfag/addenda/20260728-batch3-stabilisation-pbfag.md` |
| RED QA | `tests/qa-to-red/alp/batch3-stabilisation-red.spec.ts` |
| IAA invocation result | Completed by independent session `IAA-20260728-PREBRIEF-BATCH3-LANE-A` |
| Active Pre-Brief | `.agent-admin/assurance/iaa-prebrief-batch3-lane-a.md` |
| Acknowledgements | `20260728-batch3-stabilisation-iaa-acknowledgements.md` — COMPLETE |
| Recorded posture | Pre-Brief `ACTIVE`; no final assurance verdict claimed |
| Stage 10 gate | PASSED |
| Builder appointment | NOT YET ISSUED — separate Stage 11 action |
| Implementation | BLOCKED pending formal appointment |

## Integrity statement

This file remains the historical Foreman invocation record and briefing package. It is not itself the IAA-generated Pre-Brief or a final `ASSURANCE-TOKEN`. Independent session `IAA-20260728-PREBRIEF-BATCH3-LANE-A` used this package and the frozen PR head `d6909024d20cf0c5b4a7753e7b2060e380f6d268` to publish the active immutable Pre-Brief at `.agent-admin/assurance/iaa-prebrief-batch3-lane-a.md`.

Foreman and designated builder-candidate acknowledgements are recorded separately. Candidate designation does not appoint the builder or authorize implementation.

## Wave summary for independent IAA

The wave corrects the post-PR #101 portal and course-flow failures without changing database schema or adding email delivery. The build must produce role-aware entry, persistent administrator navigation, enrolled-only dashboard projection, distinct My Learning projection, shared VPSHR/Scannex presentation, governed asset launch, course-specific recovery, non-mutating administrator preview and honest invitation-delivery status.

## Required per-task assurance declaration

The independent IAA Pre-Brief must cover:

| Task group | Trigger | Required phases | Required evidence |
|---|---|---|---|
| `TASK-B3-LA-101..108` | Product-facing architecture/implementation | Phase 1–4 | Frozen addenda and registry; correct-RED run; implementation diff; 10/10 GREEN; regression/typecheck/build logs; exact-head deployments; administrator and learner browser proof |
| `TASK-B3-LA-201..204` | QA, deployment and user-workflow proof | Phase 1–4 | Unweakened test diff; W1/W4.1/W4.2 results; GitHub run; both relevant Vercel commit identities; VPSHR and Scannex proof |
| `TASK-B3-LA-205` | Governance handover | Phase 4 | Completed checklist, Foreman QP, ECAP reconciliation, PREHANDOVER proof and independent final IAA verdict |

## Mandatory acceptance criteria

The independent IAA must declare at least these criteria:

1. No product implementation precedes clean correct RED, Stage 7 PASS, Stage 10 completion and formal appointment.
2. The two formerly malformed missing-file tests fail through controlled assertions, never `ENOENT`.
3. No test is weakened, deleted, skipped, excluded or rewritten to manufacture GREEN.
4. Dashboard and My Learning state derive from authoritative enrolment relationships.
5. Administrator preview is role-gated and causes no enrolment or progress mutation.
6. Public course pages expose no raw protected-unit bypass.
7. VPSHR and Scannex use the same overview and governed launch model.
8. Invitation creation makes no sent/delivered claim without a provider result.
9. Email-provider, credentials, DNS and payment work remain excluded.
10. Exact-head automated and browser evidence is required before final assurance.

## Independent IAA response received

| Requirement | Result |
|---|---|
| Immutable Pre-Brief at designated location | PASS — `.agent-admin/assurance/iaa-prebrief-batch3-lane-a.md` |
| IAA session identified | PASS — `IAA-20260728-PREBRIEF-BATCH3-LANE-A` |
| Qualifying tasks cross-referenced | PASS — `TASK-B3-LA-101..108` and `TASK-B3-LA-201..205` |
| Foreman acknowledgement | PASS — acknowledgement addendum |
| Designated builder-candidate acknowledgement | PASS — `BC-ALP-B3-LA-001` |
| Final assurance verdict | NOT ISSUED — required only after build, QP, ECAP and PREHANDOVER |

Stage 10 is complete. Stage 11 builder appointment remains a separate, unperformed action.
