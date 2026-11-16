# W2 Deployed Proof / Closure Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W2 - Dashboard + Course Shell + Unit Viewer |
| Evidence Type | Deployed proof and closure decision |
| Date | 2026-06-30 |
| Status | Filed for review |
| Branch | alp-w2-deployed-proof-closure |
| Planned PR | #79 |
| Prior Implementation PR | #78 / `d241eba98b092723b57a4f584be3fbefc84490ee` |
| Deployment URL | `https://training-platform-kappa.vercel.app` |

---

## Closure Basis

PR #78 merged the W2 dashboard, generic course shell, unit viewer, course services, W2 metadata schema, and VPSHR Level 0 seed metadata.

A reviewer then performed deployed browser proof against `https://training-platform-kappa.vercel.app`.

---

## Deployed Browser Proof Results

| Proof Item | Route / Action | Result | Notes |
|---|---|---|---|
| Legacy course landing | `/courses/vpshr-level-0` | PASS | VPSHR Level 0 landing renders with course summary and start/open legacy actions. |
| Authentication boundary | `/dashboard` while unauthenticated | PASS | User is redirected to `/alp-sign-in`. |
| Sign-in route | `/alp-sign-in` | PASS | Sign-in page renders and accepts credentials. |
| Existing W1 profile route | `/profile` after sign-in | PASS | Profile and private files page still renders after W2 merge. |
| Learner dashboard | `/dashboard` after sign-in | PASS | Dashboard renders learner masthead and progress placeholder. |
| Dashboard course card | Dashboard lower section | PASS | VPSHR Level 0 assigned course card renders with `Open course shell`. |
| Generic course shell | `/learn/vpshr-level-0` | PASS | Course shell renders learning-unit sidebar and course structure. |
| Unit list | `/learn/vpshr-level-0` | PASS | Orientation plus units 1-12 render. |
| Unit launch path | `/learn/vpshr-level-0/units/introduction` and expanded original unit links | PASS WITH DEFECT CARRIED | iSpring package opens, navigation works, quizzes work, and voice-over/audio works. Some legacy embedded video objects do not consistently play. |

---

## Open Follow-Up Control

| Control ID | Control | Status | Impact | Required Action | Owner Wave |
|---|---|---|---|---|---|
| ALP-CTRL-010 | Legacy iSpring embedded video objects do not consistently play. | Open | Content playback quality issue, not W2 shell failure. | Inspect exported iSpring asset references, video file availability, MIME type, and browser console/network errors. | W2 follow-up or W3 content-hardening |

---

## Closure Decision

W2 may close for the approved Dashboard + Course Shell + Unit Viewer scope because:

1. The learner dashboard route renders after authentication.
2. The dashboard course card opens the learner course shell.
3. The generic learner course shell renders for VPSHR Level 0.
4. The unit viewer/expanded original unit launch path opens learning content.
5. The legacy course route remains available.
6. The known video playback defect is explicitly carried forward as ALP-CTRL-010.

---

## What W2 Does Not Claim

```text
Full app delivery: NOT CLAIMED.
CODE_PASS: NOT CLAIMED.
FUNCTIONAL_PASS: NOT CLAIMED.
CWT_PASS: NOT CLAIMED.
Final content quality acceptance: NOT CLAIMED.
Deployment acceptance for all waves: NOT CLAIMED.
Production readiness: NOT CLAIMED.
```

---

## W3 Entry Recommendation

After this closure PR is reviewed and merged, W3 may start for Progress + Completion, while ALP-CTRL-010 remains open for W2 follow-up or W3 content-hardening.
