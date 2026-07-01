# W3 Deployed Proof Closure Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W3 - Progress + Completion |
| Evidence Type | Deployed proof and closure decision |
| Date | 2026-07-01 |
| Status | Filed for review |
| Branch | alp-w3-deployed-proof-closure |
| Planned PR | #82 |
| Prior PRs | #80 and #81 |
| Deployment URL | `https://training-platform-kappa.vercel.app` |

---

## Closure Basis

PR #80 added the first W3 progress and completion slice.

PR #81 fixed the deployed proof gap after reviewer proof showed that completion did not visibly update progress.

Reviewer then repeated deployed proof successfully.

---

## Deployed Proof Results

| Proof Item | Route or Action | Result | Notes |
|---|---|---|---|
| Learner dashboard | `/dashboard` | PASS | Dashboard renders W3 progress-enabled view. |
| Unit viewer | `/learn/vpshr-level-0/units/introduction` | PASS | Unit viewer renders progress controls. |
| Completion action | `Mark unit complete` | PASS | Action redirects to the course shell. |
| Completion message | `/learn/vpshr-level-0?progress=unit-completed` | PASS | Displays `Unit marked complete. Progress has been updated.` |
| Course shell progress | Progress panel | PASS | Reviewer proof shows `2 of 13 units complete` and `15% complete`. |
| Unit status | Course shell unit list | PASS | Completed unit status is visible. |
| Dashboard progress | `/dashboard` after completion | PASS | Dashboard progress reflects the saved completion state. |

---

## Open Follow-Up Controls

| Control ID | Control | Status | Required Action | Owner Wave |
|---|---|---|---|---|
| ALP-CTRL-010 | Legacy iSpring embedded video objects do not consistently play. | Open | Inspect exported iSpring asset references, video file availability, MIME type, and browser console or network errors. | W3 content-hardening or later content QA |
| ALP-CTRL-011 | Live Supabase progress tables must be applied or verified before database-backed progress becomes the long-term source of truth. | Open | Apply or verify W3 progress migration tables: `progress_events`, `learner_progress`, and `completion_states`; then re-test database-backed progress persistence. | W3 follow-up before production hardening |

---

## Closure Decision

W3 may close for the approved Progress + Completion scope because the learner can mark a unit complete, the course shell shows a clear confirmation, course progress updates visibly, and dashboard progress updates visibly.

The Supabase database-progress follow-up is carried forward as ALP-CTRL-011.

---

## Non-Claims

Full app delivery: NOT CLAIMED.  
CODE_PASS: NOT CLAIMED.  
FUNCTIONAL_PASS: NOT CLAIMED.  
CWT_PASS: NOT CLAIMED.  
Final content quality acceptance: NOT CLAIMED.  
Long-term database-backed progress source of truth: NOT CLAIMED until ALP-CTRL-011 is closed.  
Deployment acceptance for all waves: NOT CLAIMED.  
Production readiness: NOT CLAIMED.

---

## W4 Entry Recommendation

After this closure PR is reviewed and merged, W4 may start for Enrolment + Payments while ALP-CTRL-010 and ALP-CTRL-011 remain open.
