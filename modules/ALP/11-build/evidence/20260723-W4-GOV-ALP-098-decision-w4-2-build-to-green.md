# GOV-ALP-098 - W4.2 Build-to-Green Implementation Evidence

**Module:** ALP - APGI Learning Portal  
**Date:** 2026-07-23  
**PR:** #98  
**Status:** Merged for code/build scope; exact-head automated GREEN accepted; live database and browser proof pending

## Authorized authority

- W4.2 prebuild merged by PR #93 / `721be18e88d284ffffc4179e71e3dd936b14a319`.
- Executable QA-ALP-252 through QA-ALP-267 and correct RED accepted by PR #94 / `43e587ac651b687845c3406b2b31ab57fbf95e0e`.
- PR #95 normalized the PR #94 post-merge tracker posture; PR #97 / `75451d27c7583ba0bd63d58adeeed6e55e7ad08b` normalized the merged W4.2 prebuild and QA statuses.

## Implementation merged

PR #98 merged as `85431882b9f8824c5b1f544649e6305bf700d60d` and implements the authorized W4.2 code slice:

- generic learner sidebar and multi-course catalogue;
- learner-specific Enrolled, Pending, Not enrolled and Revoked presentation;
- existing `admin` role authorization for administration routes;
- single and batch invitations with reason, basis, scope and expiry;
- protected invitation token persistence;
- fail-closed and idempotent invitation redemption;
- invitation and enrolment audit events;
- governed revoke/reinstate action;
- invitation schema, indexes and RLS migration `010_alp_admin_invitations.sql`;
- legacy-route retain/redirect matrix; and
- conversion of the W4.2 proof workflow from correct RED to build-to-green.

## Accepted automated evidence

The exact reviewed PR head `2376db9d7060bb21dbd045bf9430b210740889e2` passed:

- dependency installation;
- TypeScript typecheck;
- QA-ALP-252 through QA-ALP-267, 16/16 successful;
- W1 and W4.1 regression suites;
- Next.js production build;
- validation-artifact upload; and
- Vercel deployment validation.

The post-merge Vercel deployment for merge commit `85431882b9f8824c5b1f544649e6305bf700d60d` also passed.

This accepts the PR #98 implementation for the code/build scope only. It does not establish live functional proof.

## Proof still required before closure

This evidence does not close W4.2. The following remain required:

1. Review and apply `010_alp_admin_invitations.sql` to the controlled Supabase project.
2. Confirm the exact `admin` role assignment row for `johan.ras@apginc.ca` before any write.
3. Capture admin and learner browser proof for invitation creation, redemption and catalogue state.
4. Capture pending, enrolled, revoked, reinstated, invalid, expired, reused and email-mismatch paths.
5. Verify RLS, audit records and idempotency in the live database.
6. Identify and remove controlled test data after proof.
7. Re-run regressions after live proof.

## Preserved restrictions and non-claims

PR #98 and this normalization do not themselves perform or claim:

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

Automated code/build green is evidence for the PR implementation scope only and is not a substitute for controlled live functional proof.
