# PR #102 Batch 3 Exact-Head Deployment Proof

**PR**: #102  
**Head**: `15422413d1ccf7d36c9069ca24e07fa22604516c`  
**Date**: 2026-07-28  
**Status**: DEPLOYMENT READY; browser walkthrough blocked by preview SSO

## GitHub Actions

| Item | Result |
|---|---|
| Workflow | `ALP Batch 3 Build to Green` |
| Run | `30348341973` |
| Job | `prove-build-green` |
| Conclusion | SUCCESS |
| Steps | checkout, setup, install, typecheck, W4.2 regressions, W1/W4.1 regressions, Batch 3 GREEN, build, artifact upload |

## Vercel

| Project | Deployment | Preview | Status |
|---|---|---|---|
| `training-urls-module` | `8p79JCso1NbAkjnKVL7xm9h5amfk` | `https://training-urls-module-git-agent-alp-b-cdf237-rassie-ras-projects.vercel.app` | READY |

The Vercel bot updated PR #102 at 2026-07-28 09:52 UTC with READY status for the branch preview.

## Access Constraint

Unauthenticated HTTP probes to `/`, `/alp-sign-in`, `/courses/vpshr-level-0` and `/courses/scannex-training-programme` reached Vercel but returned `302` to `https://vercel.com/sso-api?...` because the preview is protected by Vercel SSO.

Result: deployment readiness is evidenced, but interactive anonymous/admin/learner browser proof cannot be completed from this environment against the protected preview URL.

