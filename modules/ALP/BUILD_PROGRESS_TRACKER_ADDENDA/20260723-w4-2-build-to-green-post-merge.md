# BUILD PROGRESS TRACKER Addendum - W4.2 Build-to-Green Post-Merge Normalization

**Module**: ALP - APGI Learning Portal  
**Date**: 2026-07-23  
**Status**: PR #98 merged; code/build GREEN accepted; controlled live proof pending  
**Repository**: APGI-cmy/Training  

## Status update

| Item | Current posture |
|---|---|
| PR #98 | Merged as `85431882b9f8824c5b1f544649e6305bf700d60d` |
| Exact reviewed implementation head | `2376db9d7060bb21dbd045bf9430b210740889e2` |
| QA range | QA-ALP-252 through QA-ALP-267 |
| Automated GREEN | Accepted for code/build scope: typecheck, 16/16 W4.2 tests, W1/W4.1 regressions, Next.js build and validation artifact passed |
| Vercel | Exact-head validation passed; post-merge deployment passed |
| Migration | `010_alp_admin_invitations.sql` merged but not applied |
| Live admin assignment | Not performed |
| Live invitation/enrolment writes | Not performed |
| W4.1 final closure | Not claimed; remaining controlled browser proof is carried forward |
| W4.2 closure | Not claimed; live database and browser proof remains required |
| W4.3-W4.5 | Not started; payment execution remains unauthorized |
| W4 closure | Not claimed |
| ALP-CTRL-010 | Open and carried forward |

## Accepted authority and evidence

- Canonical tracker: `modules/ALP/BUILD_PROGRESS_TRACKER.md`
- W4.2 prebuild evidence: `modules/ALP/11-build/evidence/20260721-W4-GOV-ALP-094-decision-enrolment-catalogue-prebuild.md`
- W4.2 executable RED evidence: `modules/ALP/11-build/evidence/20260722-W4-GOV-ALP-095-decision-w4-2-executable-red.md`
- W4.2 implementation evidence: `modules/ALP/11-build/evidence/20260723-W4-GOV-ALP-098-decision-w4-2-build-to-green.md`
- Build-to-green suite: `tests/qa-to-red/alp/w4-2-enrolment-catalogue-red.spec.ts`
- Dedicated command: `npm run test:alp:w4-2`
- Proof workflow: `.github/workflows/alp-w4-2-red-proof.yml`

## Next controlled action

1. Review the exact `010_alp_admin_invitations.sql` migration and rollback approach.
2. Confirm the exact proposed `user_roles` row for `johan.ras@apginc.ca`, including `assigned_by`, duplicate handling and cleanup.
3. Obtain explicit authorization before any live Supabase write.
4. Apply only the approved migration and verify tables, constraints, indexes and RLS.
5. Assign the approved admin role row and verify admin/non-admin route behavior.
6. Execute controlled invitation, pending, enrolled, revoked, reinstated and negative-path proof.
7. Capture browser and database evidence and remove controlled test data.
8. Re-run W4.2, W4.1 and authentication regressions.
9. File a separate live-proof evidence PR before any W4.1 or W4.2 closure decision.

## Preserved restrictions and non-claims

This normalization does not perform or claim:

- a live migration application;
- a live admin-role assignment;
- a live invitation or enrolment write;
- W4.1 final closure;
- W4.2 closure;
- W4 or full-app closure;
- W4.3 payment-status implementation;
- W4.4 provider/security/risk acceptance;
- W4.5 payment or offer-code execution;
- CODE_PASS, FUNCTIONAL_PASS or CWT_PASS;
- deployment acceptance or production readiness.

The accepted automated GREEN is evidence for PR #98's code/build implementation scope only and is not a substitute for controlled live functional proof.
