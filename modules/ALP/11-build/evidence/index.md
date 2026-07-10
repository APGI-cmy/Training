# ALP Build Evidence Index

## Status Header

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Artifact | Build Evidence Index |
| Status | Updated for W4.1 UI proof hold |
| Date | 2026-07-10 |
| Repository | APGI-cmy/Training |
| Canonical Path | `modules/ALP/11-build/evidence/index.md` |

---

## Evidence Roll-Up

| Wave | Evidence File | QA Marker(s) | Golden / Negative Path | Environment | PR / Commit | Check Status | Reviewer / Owner | Closure Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| W0 | `modules/ALP/11-build/evidence/w0-foundation-scaffold.md` | governance-artifacts; architecture-inventory | Scaffold path | GitHub / Vercel | PR #71 / `48ce32a1974b14487864713af1287ab0379cf4d8` | Accepted before merge | BC-ALP-CONSOLIDATED-001 | Closed for scaffold scope | No full app delivery claim. |
| W1 | W1 evidence files | auth; security-privacy | Auth / profile / files path | GitHub / Vercel | PR #73-#77 | Accepted before merge | BC-ALP-CONSOLIDATED-001 | Closed for W1 scope | W2 entry authorized by PR #77. |
| W2 | W2 evidence files | GOV-ALP-078; GOV-ALP-079 | Dashboard / course shell / unit viewer path | GitHub / Vercel / reviewer screenshots | PR #78-#79 | Accepted before merge | BC-ALP-CONSOLIDATED-001 / reviewer proof | Closed for W2 scope | Carries ALP-CTRL-010 forward. |
| W3 | `modules/ALP/11-build/evidence/20260630-W3-GOV-ALP-080-decision-progress-completion-entry.md` | GOV-ALP-080; progress-completion | W3 progress / completion entry path | GitHub PR evidence | PR #80 / `529c5cac1c312fb117e311a9d1b03ca7540161bf` | Vercel accepted before merge | BC-ALP-CONSOLIDATED-001 | Merged | W3 implementation slice only. |
| W3 | `modules/ALP/11-build/evidence/20260701-W3-GOV-ALP-081-decision-progress-proof-fix.md` | GOV-ALP-081; progress-proof | W3 progress proof fix path | GitHub PR evidence / reviewer proof | PR #81 / `27f96a9efb9294158ed16b47524ceeeabbb93892` | Vercel accepted before merge | BC-ALP-CONSOLIDATED-001 / reviewer proof | Merged | Visible progress recording fixed. |
| W3 | `modules/ALP/11-build/evidence/20260701-W3-GOV-ALP-082-decision-deployed-proof-closure.md` | GOV-ALP-082; deployed-ui-proof | W3 deployed UI proof path | Deployed app / reviewer screenshot | PR #82 / merged | Merged | BC-ALP-CONSOLIDATED-001 / reviewer proof | Deployed UI proof only | PR #82 did not close W3 or authorize W4; ALP-CTRL-011 still required database proof. |
| W3 | `modules/ALP/11-build/evidence/20260702-W3-GOV-ALP-083-decision-db-progress-closure.md` | GOV-ALP-083; db-progress-proof; ALP-CTRL-011 | W3 database-backed progress closure path | Live Supabase / GitHub PR evidence | PR #83 / `55c686aeda1dc293d6ad6de72526f86e2cb488c9` | Merged | BC-ALP-CONSOLIDATED-001 | Closed for approved W3 scope | Live migration verified for progress tables and W3 proof rows. |
| W4 | `modules/ALP/11-build/evidence/20260702-W4-GOV-ALP-085-decision-enrolment-payments-entry.md` | GOV-ALP-085; enrolment-payments-entry | W4 enrolment + payments entry path | GitHub PR evidence | PR #85 / `1179887489a1e0f2dddc364b837b99251ee2adbb` | Merged | BC-ALP-CONSOLIDATED-001 | Entry merged; not closed | Opens W4 governance only; no payment readiness claim. |
| W4.1 | `modules/ALP/11-build/evidence/20260702-W4-GOV-ALP-086-decision-enrolment-access-gating.md` | GOV-ALP-086; enrolment-access-gating; QA-ALP-241-244 | Enrolled learner allowed; denied states blocked | GitHub PR evidence / Supabase migration | PR #86 / `28d6b23a79abc9835c4193b603d69e783a9fa0d4` | Merged | BC-ALP-CONSOLIDATED-001 | Implementation merged | W4.1 implementation slice merged; live DB proof captured later. |
| W4.1 | `modules/ALP/11-build/evidence/20260707-W4-GOV-ALP-087-decision-enrolment-db-proof.md` | GOV-ALP-087; live-db-proof; table-existence-proof | Table existence verified; deeper DB controls pending | Live Supabase / connector SQL | PR #87 / `cf307dd31aa4086b1248481cc968e7459fc8ae23` | Merged | BC-ALP-CONSOLIDATED-001 | Partial DB proof filed; superseded by GOV-ALP-088 | Migration applied and both tables directly verified. |
| W4.1 | `modules/ALP/11-build/evidence/20260707-W4-GOV-ALP-088-decision-enrolment-db-proof-closure.md` | GOV-ALP-088; db-proof-closure; connector-validation | DB proof closure for W4.1 enrolment access gating | Live Supabase / connector SQL | PR #88 / `06d80000f35cfe90ffbc1fec3cb07f312cee1cd7` | Merged | BC-ALP-CONSOLIDATED-001 | DB proof closed for W4.1 | RLS, select policies, no write policies, table reads, table existence, and migration history directly verified. |
| W4.1 | `modules/ALP/11-build/evidence/20260710-W4-GOV-ALP-089-decision-w4-1-final-closure.md` | GOV-ALP-089; w4-1-ui-proof-hold | W4.1 UI proof hold | GitHub evidence chain / live Supabase proof chain | Current W4.1 UI proof hold PR | Pending review | BC-ALP-CONSOLIDATED-001 | W4.1 final closure held | Records that DB proof is closed but UI/browser proof is still required before final W4.1 closure. |

---

## Current Non-Claims

Full app delivery: NOT CLAIMED.  
CODE_PASS: NOT CLAIMED.  
FUNCTIONAL_PASS: NOT CLAIMED.  
CWT_PASS: NOT CLAIMED.  
Final content quality acceptance: NOT CLAIMED.  
Deployment acceptance: NOT CLAIMED.  
Production readiness: NOT CLAIMED.  
Live payment readiness: NOT CLAIMED.  
ALP-CTRL-010: OPEN and carried forward.  
W4: IMPLEMENTATION STARTED, but W4 implementation/closure is NOT CLAIMED.  
W4.1: DB PROOF CLOSED, but W4.1 FINAL CLOSURE is HELD pending UI/browser proof.
