# QA-to-Red Addendum — Batch 3 Stabilisation

## Status

CS2-authorised 2026-07-28. Tests are derived from the aligned App Description, UX, FRS, TRS, Architecture and Requirement Registry addenda.

## Lane A executable RED catalogue

| ID | Expected pre-repair failure |
|---|---|
| QA-ALP-B3-001 | `/` routes to VPSHR instead of role-aware entry. |
| QA-ALP-B3-002 | Brand link is hard-coded to VPSHR. |
| QA-ALP-B3-003 | Anonymous/admin/learner destinations are not produced by one resolver. |
| QA-ALP-B3-004 | Admin pages do not use the persistent portal sidebar. |
| QA-ALP-B3-005 | Invitations and access management are not sidebar destinations. |
| QA-ALP-B3-006 | Admin course preview does not exist. |
| QA-ALP-B3-007 | Dashboard includes published courses without enrolled access. |
| QA-ALP-B3-008 | Dashboard totals include inaccessible units. |
| QA-ALP-B3-009 | Empty enrolled dashboard does not route clearly to catalogue. |
| QA-ALP-B3-010 | My Learning relationship filter is not shared/testable. |
| QA-ALP-B3-011 | Pending/revoked actions are not explicitly modelled. |
| QA-ALP-B3-012 | VPSHR and Scannex use separate course-overview components. |
| QA-ALP-B3-013 | Public course units expose misleading or raw launch links. |
| QA-ALP-B3-014 | Course overview actions are not status-aware. |
| QA-ALP-B3-015 | Access-denied public landing is hard-coded to VPSHR. |
| QA-ALP-B3-016 | Scannex public page exposes raw published unit paths. |
| QA-ALP-B3-017 | Admin preview is absent or mutates enrolment/progress. |
| QA-ALP-B3-018 | VPSHR assets are not resolved through the safe encoder. |
| QA-ALP-B3-019 | Enrolled VPSHR unit launch does not reach actual content. |
| QA-ALP-B3-020 | Protected unit launch can bypass the governed shell. |

## Delivery-preflight RED catalogue

QA-ALP-B3-DP-001..008 cover provider decision, sender identity, domain authentication, server-only secrets, delivery adapter contract, sent/failed audit events, retry/idempotency, privacy/logging and administrator delivery status. These are preflight requirements only; no send implementation is authorised.

## Gate requirements

- `tests/qa-to-red/alp/batch3-stabilisation-red.spec.ts` must fail against merge `a056b51d9353426d5ba96154d190ca71ac44f008` for the intended reasons.
- Missing capability files must fail through explicit assertions; `ENOENT` and other harness failures are prohibited.
- The exact-head proof workflow must pass typecheck, keep all 26 established W4.2 tests and the applicable W1/W4.1 regressions green, and validate exactly 10/10 Batch 3 tests as controlled RED with zero pass/skip/todo.
- Lane A implementation must make the Lane A tests green without weakening assertions.
- Existing W1, W4.1 and W4.2 suites, typecheck and build must remain green.
- Workflow path triggers and package commands must execute the new suite.
- Browser proof remains mandatory after deployment.

## QA-builder correction record

The first PR #102 run (`30336426460`, head `54d61067ff34da0fc6a98a1da0a2c7e66c4a8c72`) established the intended missing behaviours but was not accepted as correct RED because two tests aborted through `ENOENT`.

The bounded correction:

- adds explicit missing-capability assertions for both absent files;
- separates the 26 established W4.2 regression tests from the expected-failure Batch 3 suite;
- converts the workflow into an expected-failure proof gate; and
- rejects unexpected pass, skip/todo, `ENOENT`, runner, syntax, transform and module-resolution failures.

Local preflight after correction: typecheck PASS; established W4.2 26/26 PASS; W1/W4.1 regressions 15/15 PASS; Batch 3 10/10 controlled FAIL. The accepted exact-head GitHub proof is recorded below.

## Accepted exact-head correct RED

| Item | Evidence |
|---|---|
| Commit | `3d9cc74f83c64e46a9134977e57fec5115691e54` |
| Workflow | `ALP Batch 3 Correct RED Proof` |
| Run | `30342160476` |
| Job | `prove-correct-red` / `90219973974` |
| Typecheck | PASS |
| Established W4.2 regressions | 26/26 PASS |
| W1/W4.1 regressions | 15/15 PASS |
| Batch 3 suite | 10/10 controlled FAIL |
| Harness/file-read defects | None |
| Evidence upload | PASS |

The run establishes correct RED for the frozen Lane A suite. It does not authorize implementation; Stage 10 independent IAA Pre-Brief, builder acknowledgement and formal appointment remain required.
