# GOV-ALP-095 - W4.2 Executable QA-to-Red Decision

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.2 manual/admin enrolment and generic catalogue |
| Evidence Type | Executable RED filing and proof decision |
| Date | 2026-07-22 |
| Status | Filed for RED review; W4.2 build remains blocked |
| Branch | `agent/alp-w4-2-executable-red` |
| Repository | APGI-cmy/Training |

## Authority

PR #93 merged the prebuild authority for QA-ALP-252 through QA-ALP-267. That authority requires executable tests and correct RED proof before any W4.2 implementation, live admin-role assignment, invitation write or enrolment-management write.

## Executable suite

- Test file: `tests/qa-to-red/alp/w4-2-enrolment-catalogue-red.spec.ts`
- Command: `npm run test:alp:w4-2:red`
- Proof workflow: `.github/workflows/alp-w4-2-red-proof.yml`
- QA range: QA-ALP-252 through QA-ALP-267

The suite covers:

1. generic learner navigation;
2. multi-course catalogue source;
3. learner-specific catalogue state and actions;
4. admin-only authorization;
5. legacy-route inventory and redirects;
6. invitation creation;
7. mandatory reasons;
8. protected invitation tokens;
9. invalid/expired/revoked/reused/email-mismatch denial;
10. idempotent redemption;
11. invitation lifecycle audit;
12. batch recipient outcomes;
13. governed revoke/reinstate evidence;
14. revoked access denial;
15. reinstatement audit and access restoration; and
16. pending access denial.

## Correct RED validation

A controlled local structural execution using the repository test helper and the current merged source markers produced:

- test files executed: 1;
- tests executed: 16;
- tests failed: 16;
- runner: Vitest;
- failure type: assertion failures for absent W4.2 behaviour and artifacts;
- no syntax, transform, missing-runner or skipped-test failure observed.

The GitHub proof workflow independently requires the exact branch suite to:

- exit non-zero;
- report all sixteen failures;
- contain every QA ID from QA-ALP-252 through QA-ALP-267; and
- contain no runner/setup failure markers.

## Governance decision

This PR files executable RED only. It does not authorize or perform W4.2 implementation. Build authorization may be considered only after this PR is reviewed, the branch proof is accepted, and the PR is merged.

After merge, the next separately reviewed build may implement only the approved W4.2 catalogue, admin authorization, invitation/manual enrolment, revoke/reinstate and redirect-inventory scope.

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
