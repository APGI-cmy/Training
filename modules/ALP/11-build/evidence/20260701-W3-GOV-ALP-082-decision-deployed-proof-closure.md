# W3 Deployed UI Proof Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W3 - Progress + Completion |
| Evidence Type | Deployed UI proof record |
| Date | 2026-07-01 |
| Status | Merged as deployed UI proof only |
| Branch | `alp-w3-deployed-proof-closure` |
| Closure PR | PR #82 - merged 2026-07-02 |
| Merge Commit | `91788475ec52905aed0ee1d0f8d75681c8439310` |
| Prior PRs | PR #80 and PR #81 |
| Closure Posture | PR #82 did not close W3; W3 closure required later database-backed proof in PR #83. |
| Carry Forward | ALP-CTRL-010 and ALP-CTRL-011 carried forward from PR #82. |

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

## Open Controls at PR #82 Merge

| Control ID | Control | Status at PR #82 Merge | Required Action | Owner Wave |
|---|---|---|---|---|
| ALP-CTRL-010 | Legacy iSpring embedded video objects do not consistently play. | Open | Inspect exported iSpring asset references, video file availability, MIME type, and browser console or network errors. | W3 content-hardening or later content QA |
| ALP-CTRL-011 | Live Supabase progress tables must be applied or verified before database-backed progress becomes the long-term source of truth. | Carried forward from PR #82; later closed by PR #83 | Apply or verify W3 progress migration tables and capture database-backed progress proof. | W3 follow-up before W4 entry |

---

## Decision

PR #82 records W3 deployed UI proof only.

W3 did not close in PR #82 because ALP-CTRL-011 remained open at the time of merge. W4 was not authorized by PR #82.

ALP-CTRL-011 was subsequently closed by PR #83 after live Supabase database-backed progress proof was captured.

---

## Non-Claims

W3 closure: NOT CLAIMED BY PR #82.  
W4 entry authorization: NOT CLAIMED BY PR #82.  
Full app delivery: NOT CLAIMED.  
CODE_PASS: NOT CLAIMED.  
FUNCTIONAL_PASS: NOT CLAIMED.  
CWT_PASS: NOT CLAIMED.  
Final content quality acceptance: NOT CLAIMED.  
Long-term database-backed progress source of truth: NOT CLAIMED BY PR #82; later claimed for W3 progress scope by PR #83.  
Deployment acceptance for all waves: NOT CLAIMED.  
Production readiness: NOT CLAIMED.

---

## Next Required Action at PR #82 Merge

Apply or verify the live Supabase progress tables and capture database-backed progress proof before filing W3 closure or authorizing W4.

This follow-up action was completed by PR #83 for ALP-CTRL-011.
