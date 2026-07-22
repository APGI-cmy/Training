# GOV-ALP-095 - W4.2 Executable QA-to-Red Decision

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.2 manual/admin enrolment and generic catalogue |
| Evidence Type | Executable RED filing and proof decision |
| Date | 2026-07-22 |
| Status | Exact branch RED proof passed; filed for review; W4.2 build remains blocked pending merge |
| Branch | `agent/alp-w4-2-executable-red` |
| Repository | APGI-cmy/Training |

## Authority

PR #93 merged the prebuild authority for QA-ALP-252 through QA-ALP-267. That authority requires executable tests and correct RED proof before any W4.2 implementation, live admin-role assignment, invitation write or enrolment-management write.

## Executable suite

- Test file: `tests/qa-to-red/alp/w4-2-enrolment-catalogue-red.spec.ts`
- Command: `npm run test:alp:w4-2:red`
- Proof workflow: `.github/workflows/alp-w4-2-red-proof.yml`
- QA range: QA-ALP-252 through QA-ALP-267

The suite covers generic navigation and catalogue, multi-course sourcing, learner-specific state, admin authorization, legacy redirects, invitation creation, mandatory reasons, protected tokens, negative redemption paths, idempotency, lifecycle audit, batch outcomes, revoke/reinstate evidence, revoked denial, reinstatement and pending denial.

## Correct RED validation

A controlled local structural execution produced:

- test files executed: 1;
- tests executed: 16;
- tests failed: 16;
- runner: Vitest;
- failure type: assertion failures for absent W4.2 behaviour and artifacts;
- no syntax, transform, missing-runner or skipped-test failure observed.

The exact GitHub branch proof independently completed successfully:

| Proof item | Result |
|---|---|
| Workflow | `ALP W4.2 RED Proof` |
| Run ID | `29897844810` |
| Job | `prove-correct-red` |
| Job conclusion | Success |
| Dependency installation | Success |
| RED execution step | Success |
| RED artifact upload | Success |
| Expected interpretation | All sixteen W4.2 tests executed and failed on absent behaviour; workflow converted correct RED into a passing governance check |

The workflow fails if the suite unexpectedly passes, any QA ID from QA-ALP-252 through QA-ALP-267 is absent, the expected sixteen failures are not present, or runner/setup failure markers appear.

## Governance decision

Correct executable RED is established for the PR branch. This does not authorize W4.2 implementation before review and merge. After this PR merges, a separate W4.2 build branch may implement only the approved catalogue, admin authorization, invitation/manual enrolment, revoke/reinstate and redirect-inventory scope.

## Explicit non-claims

This evidence does not claim or perform:

- W4.2 implementation;
- live `admin` assignment to `johan.ras@apginc.ca`;
- database migration application;
- invitation creation or dispatch;
- enrolment creation, revocation or reinstatement;
- W4.1 final closure;
- W4 closure;
- W4.3, W4.4 or W4.5 start;
- CODE_PASS, FUNCTIONAL_PASS or CWT_PASS;
- deployment acceptance; or
- production readiness.
