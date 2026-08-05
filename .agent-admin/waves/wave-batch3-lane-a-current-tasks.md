# Wave Checklist — Batch 3 Lane A Stabilisation

**Authority**: CS2 Johan Ras, 2026-07-28  
**PR**: #102  
**Base**: `a056b51d9353426d5ba96154d190ca71ac44f008`  
**Scope**: Portal and course-flow stabilisation only  
**IAA Pre-Brief**: `.agent-admin/assurance/iaa-prebrief-batch3-lane-a.md`  
**IAA Session**: `IAA-20260728-PREBRIEF-BATCH3-LANE-A`  
**Appointed Builder**: `BC-ALP-B3-LA-001`  
**Appointment**: `APPT-ALP-B3-LA-001`  
**Status**: CODE / BUILD GREEN — final assurance NO-GO pending browser proof and dependency-audit disposition

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
      notes: Shared presentation and governed launch model.
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
- [ ] `TASK-B3-LA-203` — Verify exact-head GitHub and relevant Vercel deployments.
      builder: BC-ALP-B3-LA-001
      qp_verdict: PARTIAL
      notes: Historical exact-head deployments and browser proof passed through Correction 2. After the 2026-08-05 rebase, fresh exact-head CI and training-platform preview evidence are required before final handover.
- [ ] `TASK-B3-LA-204` — Pass administrator and learner browser proof for both VPSHR and Scannex.
      builder: BC-ALP-B3-LA-001
      qp_verdict: BLOCKED
      notes: Product-owner authenticated proof passed on Correction 2: administrator portal shell, VPSHR and Scannex playback, next-unit navigation, and learner-only sidebar. A short smoke test remains required on the rebased preview.
- [ ] `TASK-B3-LA-205` — Complete Foreman QP, ECAP and independent final IAA before any merge recommendation.
      builder: Foreman / ECAP administrator / independent-assurance-agent
      qp_verdict: REBASE-GATE
      notes: The prior NO-GO evidence is retained as historical. The 2026-08-05 release candidate has clean scoped gates and audit; final disposition awaits exact-head CI and preview smoke.

## Excluded work

Invitation-provider selection or sending, credentials, DNS, payment work, controlled-data cleanup, W4 closure and production-readiness claims are not tasks in this wave.
