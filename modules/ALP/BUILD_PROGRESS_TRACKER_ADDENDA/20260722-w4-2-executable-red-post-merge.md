# BUILD PROGRESS TRACKER Addendum - W4.2 Executable RED Post-Merge Normalization

**Module**: ALP - APGI Learning Portal  
**Date**: 2026-07-22  
**Status**: PR #94 merged; separate W4.2 build-to-green cycle authorized  
**Repository**: APGI-cmy/Training

## Status update

| Item | Current posture |
|---|---|
| PR #93 | Merged as `721be18e88d284ffffc4179e71e3dd936b14a319`; W4.2 prebuild authority accepted |
| PR #94 | Merged as `43e587ac651b687845c3406b2b31ab57fbf95e0e` |
| Exact reviewed RED head | `0f310793f2fbf792966632a11a7c6a9feb280d75` |
| QA range | QA-ALP-252 through QA-ALP-267 |
| Correct RED | Accepted: exactly 16 tests executed and all 16 failed for absent W4.2 behaviour |
| W4.2 implementation | Not started |
| W4.2 build authorization | Authorized only on a new, separate build branch |
| W4.1 final closure | Not claimed; remaining controlled browser proof is carried forward |
| W4.3-W4.5 | Not started; payment execution remains unauthorized |
| W4 closure | Not claimed |
| ALP-CTRL-010 | Open and carried forward |

## Accepted authority and evidence

- Canonical tracker: `modules/ALP/BUILD_PROGRESS_TRACKER.md`
- W4.2 prebuild evidence: `modules/ALP/11-build/evidence/20260721-W4-GOV-ALP-094-decision-enrolment-catalogue-prebuild.md`
- W4.2 executable RED evidence: `modules/ALP/11-build/evidence/20260722-W4-GOV-ALP-095-decision-w4-2-executable-red.md`
- Executable RED suite: `tests/qa-to-red/alp/w4-2-enrolment-catalogue-red.spec.ts`
- Dedicated command: `npm run test:alp:w4-2:red`
- Proof workflow: `.github/workflows/alp-w4-2-red-proof.yml`

## Next authorized action

1. Open a separate W4.2 build branch from current `main`.
2. Implement only the approved generic catalogue/sidebar, admin authorization, invitation/manual enrolment, revoke/reinstate and redirect-inventory scope.
3. Build QA-ALP-252 through QA-ALP-267 to green.
4. Preserve all existing regression suites.
5. Apply any controlled admin assignment and test-data writes only inside the authorized implementation/proof cycle.
6. Capture browser and database evidence, including cleanup.
7. File W4.2 closure only after implementation, QA and evidence are accepted.

## Preserved restrictions and non-claims

This normalization does not perform or claim:

- W4.2 application implementation;
- a live admin-role assignment;
- a database migration application;
- an invitation or enrolment write;
- W4.1 final closure;
- W4 or full-app closure;
- W4.3 payment-status implementation;
- W4.4 provider/security/risk acceptance;
- W4.5 payment execution;
- CODE_PASS, FUNCTIONAL_PASS or CWT_PASS;
- deployment acceptance or production readiness.

The Scannex course-authoring work is content development and is not recorded as completion of any ALP application build wave.
