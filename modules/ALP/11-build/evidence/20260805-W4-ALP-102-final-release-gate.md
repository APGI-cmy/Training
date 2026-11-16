# PR #102 Final Smoke-Test Evidence

**PR**: #102 — Stabilise ALP Batch 3 portal and course flow  
**Date**: 2026-08-05  
**Product head under test**: `5636afa245bfc1dd5a67011346c8976698a180b5`  
**Base**: `main` at `57cc041f182cb20a4b77b7b09fd60f3d4928640e`  
**Environment**: protected, non-production `training-platform` preview  
**Status**: **Evidence complete — formal independent IAA disposition pending**

## Exact-head automated evidence

| Gate | Evidence | Result |
|---|---|---|
| GitHub Actions | `ALP Batch 3 Build to Green`, run `30987669988` | PASS |
| Vercel — application | `training-platform` status on the product head | PASS |
| Vercel — URL module | `training-urls-module` status on the product head | PASS |
| Batch 3 frozen suite | 10 assertions | PASS |
| Correction 1 suite | 2 assertions | PASS |
| W4.2 regression suite | 36 assertions | PASS |
| Typecheck / production build | Next 16.3.0 | PASS |
| Course-media guard | 66 real MP4 files | PASS |
| Production dependency audit | `npm audit --omit=dev --audit-level=high` | 0 advisories |

## Authenticated browser smoke evidence

The CS2 tester completed the final smoke test on the protected preview and supplied screenshots with the browser address visible.

| Path | Observed result | Result |
|---|---|---|
| Administrator → VPSHR Level 0 → Introduction preview | Portal-contained administrator preview loaded and played | PASS |
| Administrator → Scannex Training Programme → LU1 preview | Portal-contained administrator preview loaded and played | PASS |
| Learner sign-in → Dashboard | Learner dashboard loaded | PASS |
| Learner navigation | Only Dashboard, Course catalogue, My learning and Profile were present; Administration, Invitations, Manage enrolments and Course preview were absent | PASS |

No invitations, enrolments or learner-progress actions were created during this smoke test. The administrator preview remains non-mutating.

## Scope and residual posture

This record covers only the authorised Batch 3 Lane A scope and Corrections 1–2. It does not claim W4 closure, payment implementation, invitation delivery, production readiness, or full CWT completion. The requested full-page player control is a separately scoped usability enhancement, not a release blocker for this PR.

## Required next governance action

An authorised independent IAA reviewer must assess this evidence and issue the formal GO or NO-GO decision. Until that disposition is recorded, PR #102 remains open and unmerged.
