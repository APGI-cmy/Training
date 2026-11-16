# Implementation Plan Addendum — Batch 3 Stabilisation

## Sequence

1. Freeze authority addenda and tracker failure record.
2. Commit executable Lane A QA-to-Red and prove correct RED against `a056b51d9353426d5ba96154d190ca71ac44f008`.
3. Implement role-aware root/brand routing.
4. Unify administrator and learner navigation shell.
5. Filter dashboard to enrolled courses and formalise My Learning relationships.
6. Introduce shared course overview for VPSHR and Scannex.
7. Remove public raw-unit bypasses and genericise recovery links.
8. Add role-gated admin preview without enrolment/progress mutation.
9. Correct VPSHR governed asset launch.
10. Run Lane A suite to GREEN, then W1/W4.1/W4.2 regressions, typecheck and production build.
11. Verify exact-head GitHub and both Vercel deployments.
12. Obtain browser proof using the preserved Batch 3 learner state.
13. Only after proof, proceed to evidence cleanup and closure recommendation.

## Delivery-preflight sequence

A separate branch/PR shall document provider options, sender/domain ownership, Vercel secret scope, delivery adapter contract, audit transitions, idempotency/retry, privacy and operational support. It shall not add credentials, send mail or change live invitation state.

## Stop gates

Pause on requirement contradiction, test weakness, unexpected data mutation, security concern, CI regression, deployment mismatch or browser failure.