# GOV-ALP-098 - W4.2 Build-to-Green Implementation Evidence

**Module:** ALP - APGI Learning Portal  
**Date:** 2026-07-23  
**PR:** #98  
**Status:** Implementation filed; current-head automated gate required; live database and browser proof pending

## Authorized authority

- W4.2 prebuild merged by PR #93 / `721be18e88d284ffffc4179e71e3dd936b14a319`.
- Executable QA-ALP-252 through QA-ALP-267 and correct RED accepted by PR #94 / `43e587ac651b687845c3406b2b31ab57fbf95e0e`.
- Post-merge tracker normalization accepted by PR #95 and PR #97.

## Implementation filed

PR #98 implements the authorized W4.2 code slice:

- generic learner sidebar and multi-course catalogue;
- learner-specific Enrolled, Pending, Not enrolled and Revoked presentation;
- existing `admin` role authorization for administration routes;
- single and batch invitations with reason, basis, scope and expiry;
- protected invitation token persistence;
- fail-closed and idempotent invitation redemption;
- invitation and enrolment audit events;
- governed revoke/reinstate action;
- invitation schema, indexes and RLS migration;
- legacy-route retain/redirect matrix; and
- conversion of the W4.2 proof workflow from correct RED to build-to-green.

## Automated evidence rule

The authoritative evidence is the successful `ALP W4.2 Build to Green` check and successful Vercel status on the current PR head. The workflow must show:

- dependency installation successful;
- TypeScript typecheck successful;
- QA-ALP-252 through QA-ALP-267 successful;
- Next.js production build successful; and
- build-output artifact uploaded successfully.

A passed check on an older head does not authorize merge after the branch changes.

## Proof still required before closure

This evidence does not close W4.2. The following remain required:

1. Review and apply `006_alp_admin_invitations.sql` to the controlled Supabase project.
2. Confirm exact `admin` role assignment row for `johan.ras@apginc.ca` before any write.
3. Capture admin and learner browser proof for invitation creation, redemption and catalogue state.
4. Capture pending, enrolled, revoked, reinstated, invalid, expired, reused and email-mismatch paths.
5. Verify RLS, audit records and idempotency in the live database.
6. Identify and remove controlled test data after proof.
7. Re-run regressions after live proof.

## Preserved restrictions and non-claims

PR #98 does not itself perform or claim:

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
