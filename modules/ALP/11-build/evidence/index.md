# ALP Build Evidence Index

## Status Header

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Artifact | Build Evidence Index |
| Status | Updated for W4.2 build-to-green implementation filing |
| Date | 2026-07-23 |
| Repository | APGI-cmy/Training |
| Canonical Path | `modules/ALP/11-build/evidence/index.md` |

---

## Evidence Roll-Up

| Wave | Evidence File | QA Marker(s) | Golden / Negative Path | Environment | PR / Commit | Check Status | Reviewer / Owner | Closure Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| W0 | `modules/ALP/11-build/evidence/w0-foundation-scaffold.md` | governance-artifacts; architecture-inventory | Scaffold path | GitHub / Vercel | PR #71 / `48ce32a1974b14487864713af1287ab0379cf4d8` | Accepted before merge | BC-ALP-CONSOLIDATED-001 | Closed for scaffold scope | No full app delivery claim. |
| W1 | W1 evidence files | auth; security-privacy | Auth / profile / files path | GitHub / Vercel | PR #73-#77 | Accepted before merge | BC-ALP-CONSOLIDATED-001 | Closed for W1 scope | W2 entry authorized by PR #77. |
| W2 | W2 evidence files | GOV-ALP-078; GOV-ALP-079 | Dashboard / course shell / unit viewer path | GitHub / Vercel / reviewer screenshots | PR #78-#79 | Accepted before merge | BC-ALP-CONSOLIDATED-001 / reviewer proof | Closed for W2 scope | Carries ALP-CTRL-010 forward. |
| W3 | `modules/ALP/11-build/evidence/20260630-W3-GOV-ALP-080-decision-progress-completion-entry.md` | GOV-ALP-080 | W3 progress/completion entry | GitHub PR evidence | PR #80 | Merged | BC-ALP-CONSOLIDATED-001 | Merged | W3 implementation slice only. |
| W3 | `modules/ALP/11-build/evidence/20260701-W3-GOV-ALP-081-decision-progress-proof-fix.md` | GOV-ALP-081 | Progress proof fix | GitHub / reviewer proof | PR #81 | Merged | BC-ALP-CONSOLIDATED-001 | Merged | Visible progress recording fixed. |
| W3 | `modules/ALP/11-build/evidence/20260701-W3-GOV-ALP-082-decision-deployed-proof-closure.md` | GOV-ALP-082 | Deployed UI proof | Deployed app | PR #82 | Merged | Reviewer proof | UI proof only | Did not close W3. |
| W3 | `modules/ALP/11-build/evidence/20260702-W3-GOV-ALP-083-decision-db-progress-closure.md` | GOV-ALP-083; ALP-CTRL-011 | Database-backed progress closure | Live Supabase | PR #83 | Merged | BC-ALP-CONSOLIDATED-001 | Closed for approved W3 scope | Live progress tables verified. |
| W4 | `modules/ALP/11-build/evidence/20260702-W4-GOV-ALP-085-decision-enrolment-payments-entry.md` | GOV-ALP-085 | W4 entry and payment sequencing | GitHub PR evidence | PR #85 | Merged | BC-ALP-CONSOLIDATED-001 | Entry merged; not closed | Establishes W4.1-W4.5 sequence. |
| W4.1 | `modules/ALP/11-build/evidence/20260702-W4-GOV-ALP-086-decision-enrolment-access-gating.md` | GOV-ALP-086; QA-ALP-241-244 | Enrolment access gating | GitHub / Supabase migration | PR #86 | Merged | BC-ALP-CONSOLIDATED-001 | Implementation merged | Live proof followed. |
| W4.1 | `modules/ALP/11-build/evidence/20260707-W4-GOV-ALP-087-decision-enrolment-db-proof.md` | GOV-ALP-087 | Table existence | Live Supabase | PR #87 | Merged | BC-ALP-CONSOLIDATED-001 | Superseded by GOV-ALP-088 | Partial DB proof. |
| W4.1 | `modules/ALP/11-build/evidence/20260707-W4-GOV-ALP-088-decision-enrolment-db-proof-closure.md` | GOV-ALP-088 | RLS/policies/reads/migration proof | Live Supabase | PR #88 | Merged | BC-ALP-CONSOLIDATED-001 | DB proof closed | No write policies verified. |
| W4.1 | `modules/ALP/11-build/evidence/20260710-W4-GOV-ALP-089-decision-w4-1-final-closure.md` | GOV-ALP-089 | UI proof hold | GitHub / Supabase | PR #89 | Merged | BC-ALP-CONSOLIDATED-001 | Final closure held | Browser proof required. |
| W4.1 | `modules/ALP/11-build/evidence/20260710-W4-GOV-ALP-091-decision-ui-proof-enabler.md` | GOV-ALP-091; QA-ALP-246-247 | Sign-out/navigation clarification | GitHub / Vercel | PR #90 | Merged | BC-ALP-CONSOLIDATED-001 | Enabler merged | Navigation loop found later. |
| W4.1 | `modules/ALP/11-build/evidence/20260712-W4-GOV-ALP-092-decision-navigation-proof-prebuild.md` | GOV-ALP-092 | Navigation prebuild | User screenshots / governance | PR #91 | Merged | BC-ALP-CONSOLIDATED-001 | Prebuild merged | Narrow loop-breaker authorized. |
| W4.1 | `modules/ALP/11-build/evidence/20260715-W4-GOV-ALP-093-decision-navigation-loop-breaker-build.md` | GOV-ALP-093; QA-ALP-248-251 | Sidebar, denied-state recovery and not-enrolled path | GitHub / Vercel / user screenshots | PR #92 / `a0c0944a8399c97c90817916f74140c5369daede` | Merged; Vercel passed | Product-owner browser proof | Partial UI proof accepted; W4.1 open | Enrolled, pending, revoked and unknown/error proof remains. |
| W4.2 / W4.3-W4.5 roadmap | `modules/ALP/11-build/evidence/20260721-W4-GOV-ALP-094-decision-enrolment-catalogue-prebuild.md` | QA-ALP-252-267; reserved QA-ALP-268-276 | Catalogue, admin invitation/access management; payment roadmap gates | GitHub PR evidence / live-schema inspection | PR #93 / `721be18e88d284ffffc4179e71e3dd936b14a319` | Merged; Vercel passed | Product owner / reviewer | Prebuild merged | W4.2 RED accepted later; W4.3-W4.5 remain separate later cycles. |
| W4.2 | `modules/ALP/11-build/evidence/20260722-W4-GOV-ALP-095-decision-w4-2-executable-red.md` | QA-ALP-252-267 | Correct RED for absent catalogue/admin invitation/access management | Vitest / GitHub Actions | PR #94 / `43e587ac651b687845c3406b2b31ab57fbf95e0e` | Exact-head RED proof passed; merged | Product owner / reviewer | Executable RED accepted | Separate W4.2 build authorized. |
| W4.2 | `modules/ALP/11-build/evidence/20260723-W4-GOV-ALP-098-decision-w4-2-build-to-green.md` | QA-ALP-252-267 | Catalogue/admin invitation/access management build | TypeScript / Vitest / Next.js / Vercel | PR #98 current | Current-head typecheck, 16/16 W4.2 tests, build and Vercel required | Product owner / reviewer | Implementation filed; live proof pending | No live migration, role assignment or test-data write performed. |

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
W4: IMPLEMENTATION STARTED, but W4 closure is NOT CLAIMED.  
W4.1: DB proof closed and partial browser proof accepted; FINAL CLOSURE NOT CLAIMED.  
W4.2: IMPLEMENTATION FILED; AUTOMATED GREEN REQUIRED ON CURRENT HEAD; LIVE DB/BROWSER PROOF PENDING.  
W4.3-W4.5: ROADMAP ONLY; PAYMENT EXECUTION NOT AUTHORIZED.  
