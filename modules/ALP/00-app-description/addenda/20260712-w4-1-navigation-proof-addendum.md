# App Description Addendum - W4.1 Navigation Proof

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/00-app-description/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md` |
| Addendum ID | AD-ALP-W4-1-NAV-20260712 |
| Date | 2026-07-12 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-1-nav-proof-prebuild` |

---

## Trigger

Post-PR #90 browser testing confirmed that the sign-out enabler works and returns the learner to `/alp-sign-in`. It also confirmed that a signed-in learner can reach dashboard/profile context. However, browser testing identified a locked-circle navigation issue where Dashboard, Return to dashboard, and Gated Level 0 did not allow controlled proof of governed course access.

The product owner also directed that footer navigation should move to a sidebar, and that app changes/additions must first be reflected in prebuild artifacts.

---

## Required App Behaviour

- The learner interface must provide a persistent sidebar or clearly equivalent learner navigation shell.
- The navigation shell must expose Dashboard, Profile, Public Level 0 landing, Gated Level 0 course, first gated unit, and Sign out.
- The learner must not be trapped in a loop between dashboard and denied-state screens.
- Public course landing routes and governed learner routes must remain visibly distinguishable.
- Sign-out must remain visible and must return the learner to `/alp-sign-in`.

---

## Governance Boundary

This addendum specifies the next navigation/sidebar prebuild requirement only. It does not itself authorize code changes, final W4.1 closure, W4 closure, W4.2 start, payment readiness, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS, deployment acceptance, or production readiness.
