# Wave Checklist — Batch 3 Lane A Stabilisation

**Authority**: CS2 Johan Ras, 2026-07-28  
**PR**: #102  
**Base**: `a056b51d9353426d5ba96154d190ca71ac44f008`  
**Scope**: Portal and course-flow stabilisation only  
**IAA Pre-Brief**: `.agent-admin/assurance/iaa-prebrief-batch3-lane-a.md`  
**IAA Session**: `IAA-20260805-FINAL-BATCH3-LANE-A`  
**Appointed Builder**: `BC-ALP-B3-LA-001`  
**Appointment**: `APPT-ALP-B3-LA-001`  
**Status**: PEER-REVIEW CORRECTION — the prior exact-head evidence and Final IAA peer-review GO are complete. The successor review correction requires fresh exact-head CI, preview validation and an amended Final IAA before any merge decision.

## Pre-build gate tasks

- [x] `TASK-B3-LA-000` — Align the Batch 3 authority stack and record deviation `DEV-ALP-B3-20260728-PORTAL-COURSE-FLOW`.
      builder: Foreman/Governance
      qp_verdict: PASS
      notes: Authority stack and tracker deviation filed on PR #102.
- [x] `TASK-B3-LA-001` — Commit executable Batch 3 QA-to-Red.
      builder: Foreman QA/governance correction lane
      qp_verdict: PASS
      notes: `tests/qa-to-red/alp/batch3-stabilisation-red.spec.ts` committed.
- [x] `TASK-B3-LA-002` — Obtain clean exact-head correct-RED proof and record PBFAG PASS.
      builder: Foreman QA/governance correction lane
      qp_verdict: PASS
      notes: Commit `3d9cc74f83c64e46a9134977e57fec5115691e54`; run `30342160476`.
- [x] `TASK-B3-LA-003` — Obtain an independent IAA-generated Pre-Brief and record Foreman and designated-builder acknowledgements.
      builder: independent-assurance-agent / Foreman acknowledgement lane
      qp_verdict: PASS
      notes: `IAA-20260728-PREBRIEF-BATCH3-LANE-A`; `BC-ALP-B3-LA-001` acknowledged before Stage 11 appointment.
- [x] `TASK-B3-LA-004` — Complete the builder checklist and issue the bounded Lane A builder appointment.
      builder: Foreman
      qp_verdict: PASS
      notes: `APPT-ALP-B3-LA-001`; `BC-ALP-B3-LA-001` appointed for frozen Batch 3 Lane A build-to-Green only.

## Authorised implementation tasks after appointment

- [x] `TASK-B3-LA-101` — Implement one role-aware root, sign-in and brand destination resolver.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: Implementation authorised only within frozen Lane A scope.
- [x] `TASK-B3-LA-102` — Integrate administrator destinations into the persistent portal sidebar.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: Implementation authorised only within frozen Lane A scope.
- [x] `TASK-B3-LA-103` — Filter the dashboard to enrolled courses and separate My Learning from the catalogue.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: Authoritative enrolment relationships only.
- [x] `TASK-B3-LA-104` — Render VPSHR and Scannex through one shared, status-aware course overview.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: Implementation authorised only within frozen Lane A scope.
- [x] `TASK-B3-LA-105` — Remove public protected-asset bypasses and use course-specific recovery links.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: Fail closed; no raw protected-unit exposure.
- [x] `TASK-B3-LA-106` — Add role-gated, non-mutating administrator course preview.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: No enrolment or progress mutation.
- [x] `TASK-B3-LA-107` — Resolve VPSHR assets through the shared safe encoder.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: Preserve Scannex behaviour.
- [x] `TASK-B3-LA-108` — Report invitation creation honestly as created-but-not-sent without adding a delivery provider.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: PR #103 remains the separate provider preflight lane.

## Proof and handover tasks

- [x] `TASK-B3-LA-201` — Build the frozen Batch 3 tests to 10/10 GREEN without weakening assertions.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: Zero Test Debt and no test dodging.
- [x] `TASK-B3-LA-202` — Keep W1, W4.1 and established W4.2 regressions GREEN; pass typecheck and production build.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS
      notes: No Regression.
- [x] `TASK-B3-LA-203` — Verify exact-head GitHub and relevant Vercel deployments.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS at the prior release candidate
      notes: GitHub Actions run `30987669988` and the `training-platform` preview were green at product head `5636afa…`. A successor code correction is now awaiting its own exact-head validation.
- [x] `TASK-B3-LA-204` — Pass administrator and learner browser proof for both VPSHR and Scannex.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PASS at the prior release candidate
      notes: Product-owner smoke proof confirmed VPSHR and Scannex playback plus learner-only navigation; see `modules/ALP/11-build/evidence/20260805-W4-ALP-102-final-release-gate.md`. The successor correction needs targeted browser confirmation.
- [x] `TASK-B3-LA-205` — Complete Foreman QP, ECAP and independent final IAA before any merge recommendation.
      builder: Foreman / ECAP administrator / independent-assurance-agent
      qp_verdict: GO FOR PEER REVIEW at the prior release candidate
      notes: `IAA-20260805-FINAL-BATCH3-LANE-A-GO-PEER-REVIEW` issued at `f71e9e3…`; it is not merge authority. Any post-token product change requires an amended Final IAA after fresh exact-head evidence.

## Excluded work

Invitation-provider selection or sending, credentials, DNS, payment work, controlled-data cleanup, W4 closure and production-readiness claims are not tasks in this wave.
