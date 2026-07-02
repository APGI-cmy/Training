# W3 Deployed UI Proof Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W3 - Progress + Completion |
| Evidence Type | Deployed UI proof record |
| Date | 2026-07-01 |
| Status | Filed for review |
| Branch | alp-w3-deployed-proof-closure |
| Planned PR | #82 |
| Prior PRs | #80 and #81 |
| Deployment URL | `https://training-platform-kappa.vercel.app` |

---

## Proof Basis

PR #80 added the first W3 progress and completion slice.

PR #81 fixed the deployed proof gap after reviewer proof showed that completion did not visibly update progress.

Reviewer then repeated deployed UI proof successfully.

---

## Deployed UI Proof Results

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

## Open Controls

| Control ID | Control | Status | Required Action | Owner Wave |
|---|---|---|---|---|
| ALP-CTRL-010 | Legacy iSpring embedded video objects do not consistently play. | Open | Inspect exported iSpring asset references, video file availability, MIME type, and browser console or network errors. | W3 content-hardening or later content QA |
| ALP-CTRL-011 | Live Supabase progress tables must be applied or verified before database-backed progress becomes the long-term source of truth. | Blocking W3 closure | Apply or verify W3 progress migration tables: `progress_events`, `learner_progress`, and `completion_states`; then capture database-backed progress proof. | W3 follow-up before W4 entry |

---

## Decision

This PR records W3 deployed UI proof only.

W3 does not close in this PR because ALP-CTRL-011 remains open. W4 must not start until Supabase database-backed progress proof is captured.

---

## Non-Claims

W3 closure: NOT CLAIMED.  
W4 entry authorization: NOT CLAIMED.  
Full app delivery: NOT CLAIMED.  
CODE_PASS: NOT CLAIMED.  
FUNCTIONAL_PASS: NOT CLAIMED.  
CWT_PASS: NOT CLAIMED.  
Final content quality acceptance: NOT CLAIMED.  
Long-term database-backed progress source of truth: NOT CLAIMED until ALP-CTRL-011 is closed.  
Deployment acceptance for all waves: NOT CLAIMED.  
Production readiness: NOT CLAIMED.

---

## Next Required Action

Apply or verify the live Supabase progress tables and capture database-backed progress proof before filing W3 closure or authorizing W4.
