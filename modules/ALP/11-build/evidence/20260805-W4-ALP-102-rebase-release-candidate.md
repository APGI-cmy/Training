# PR #102 Batch 3 Rebase Release Candidate

**PR**: #102  
**Date**: 2026-08-05  
**Base**: `main` at `57cc041f182cb20a4b77b7b09fd60f3d4928640e` (PR #103 merged)  
**Status**: REBASE CANDIDATE — do not merge until the exact-head checks below complete

## Reconciliation

PR #102 was rebased cleanly onto current `main`. The three `main` commits are ancestors of the candidate branch; there were no rebase conflicts. The scope remains Batch 3 Lane A plus the already-authorised Corrections 1 and 2.

Historical authenticated browser proof is retained:

- administrator persistent sidebar and portal-contained course preview;
- VPSHR and Scannex playback, including next-unit navigation;
- learner-only sidebar with no administration links; and
- no invitation or enrolment action taken during proof.

## Dependency Remediation

The previous audit blockers were remediated without a major-version downgrade:

- `next`: `16.2.12` to `16.3.0`;
- `sharp`: resolves to `0.35.3` through Next; and
- the repository PostCSS override: `8.5.15` to `8.5.23`, the version declared by Next 16.3.0.

`npm audit --omit=dev --audit-level=high` reports **0 high, 0 critical, 0 total** advisories after the remediation.

## Local Candidate Gates

| Gate | Result |
|---|---|
| Batch 3 frozen suite | 10/10 PASS |
| Correction 1 preview suite | 2/2 PASS |
| W4.2 regression suite | 36/36 PASS |
| Typecheck | PASS |
| Course-media prebuild guard | PASS — 66 real MP4 files |
| Next production build | PASS on Next 16.3.0 |
| Production dependency audit | PASS — zero high/critical advisories |

The broad legacy `test:alp:red` command remains non-gating: it contains known failures for un-authorised assessment, certificate, payment, webhook and audit capabilities outside Batch 3. Those failures pre-date this release candidate and were not suppressed or changed.

## Remaining Exact-Head Gates

1. Publish the rebased branch and obtain a successful GitHub Actions run for its exact head.
2. Create a fresh non-production `training-platform` preview from that exact head.
3. Smoke test administrator VPSHR/Scannex preview playback and learner-only navigation.
4. Issue the successor Foreman QP, ECAP and final IAA disposition. Only a GO token may make PR #102 ready for review.

No invitation delivery, credentials, DNS, payment implementation, production deployment, controlled-data cleanup, W4 closure or production-readiness claim is authorised by this candidate.
