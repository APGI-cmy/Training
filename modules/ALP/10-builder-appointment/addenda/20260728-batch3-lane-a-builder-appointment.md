# Stage 11 Builder Appointment Addendum — Batch 3 Lane A

**Module**: ALP — APGI Learning Portal  
**PR**: #102  
**Date**: 2026-07-28  
**Authority**: CS2 Johan Ras, 2026-07-28  
**Appointment ID**: `APPT-ALP-B3-LA-001`  
**Appointed Builder**: `BC-ALP-B3-LA-001`  
**Status**: APPOINTED FOR BATCH 3 LANE A BUILD-TO-GREEN

## Purpose

This addendum completes the Batch 3 Lane A Stage 11 gate after accepted correct RED, PBFAG PASS, independent IAA Pre-Brief activation and Foreman / designated-candidate acknowledgements on PR #102.

It appoints `BC-ALP-B3-LA-001` only for the frozen Batch 3 Lane A portal and course-flow stabilisation scope. It does not authorize invitation-provider selection, email sending, credentials, DNS, payment work, controlled-data cleanup, W4 closure, production readiness, or merge.

## Entry Gate Evidence

| Gate | Evidence | Status |
|---|---|---|
| CS2 authority | PR #102 authority record and 2026-07-28 user authorization | PASS |
| Correct RED | Commit `3d9cc74f83c64e46a9134977e57fec5115691e54`, run `30342160476` | PASS |
| PBFAG | `modules/ALP/06-pbfag/addenda/20260728-batch3-stabilisation-pbfag.md` | PASS |
| Independent IAA Pre-Brief | `.agent-admin/assurance/iaa-prebrief-batch3-lane-a.md` | ACTIVE |
| IAA session | `IAA-20260728-PREBRIEF-BATCH3-LANE-A` | ACTIVE |
| Foreman acknowledgement | `modules/ALP/09-iaa-pre-brief/addenda/20260728-batch3-stabilisation-iaa-acknowledgements.md` | COMPLETE |
| Candidate acknowledgement | `modules/ALP/09-iaa-pre-brief/addenda/20260728-batch3-stabilisation-iaa-acknowledgements.md` | COMPLETE |
| Builder checklist remaining item | `TASK-B3-LA-004` | COMPLETED BY THIS ADDENDUM |

## Formal Appointment

```text
Foreman Appointment ID: APPT-ALP-B3-LA-001
Appointed Builder: BC-ALP-B3-LA-001
Assigned PR: #102
Assigned Scope: Batch 3 Lane A portal and course-flow stabilisation only
Source Baseline: PR #101 merge a056b51d9353426d5ba96154d190ca71ac44f008
Active Pre-Brief: IAA-20260728-PREBRIEF-BATCH3-LANE-A
Task Set: TASK-B3-LA-101..108 and TASK-B3-LA-201..205
Foreman Decision: APPOINTED
Implementation Authorization: LIMITED TO FROZEN LANE A SCOPE
Merge Authorization: NOT GRANTED
```

## Builder Obligations

`BC-ALP-B3-LA-001` must:

- implement only `TASK-B3-LA-101..108`;
- build the frozen Batch 3 suite to 10/10 GREEN without weakening, skipping, deleting or replacing assertions;
- preserve W1, W4.1 and established W4.2 regressions;
- pass typecheck and production build;
- bind GitHub, Vercel and browser evidence to one exact PR head;
- provide administrator and learner browser proof for VPSHR and Scannex;
- record invitation creation as created-but-not-sent unless a later provider lane authorizes delivery;
- stop and escalate any scope, security, data, deployment or evidence blocker.

## Excluded Work

The appointment excludes:

- invitation email provider selection or delivery implementation;
- sender identity, DNS, SPF, DKIM, DMARC or secret handling;
- payment provider, checkout, webhook or payment-state execution;
- Batch 4 cleanup or controlled-data removal;
- W4 closure, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS or production-readiness claims before final evidence;
- merge approval.

## Stage 11 Decision

```text
Stage 11 Builder Appointment: PASS.
Appointed Builder: BC-ALP-B3-LA-001.
Scope: Batch 3 Lane A only.
Stage 12 Build-to-Green: AUTHORIZED FOR FROZEN LANE A SCOPE.
Final merge recommendation: PROHIBITED until QP, ECAP, PREHANDOVER and independent final IAA are complete.
```

## Proxy Sign-Off

Approved by AI-assisted CS2 proxy evaluator for Johan Ras. CS2 Authority: Johan Ras.

