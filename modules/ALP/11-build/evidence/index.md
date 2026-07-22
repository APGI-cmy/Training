# ALP Build Evidence Index

## Status Header

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Artifact | Build Evidence Index |
| Status | Updated for W4.2 executable QA-to-Red filing |
| Date | 2026-07-22 |
| Repository | APGI-cmy/Training |
| Canonical Path | `modules/ALP/11-build/evidence/index.md` |

---

## Evidence Roll-Up

| Wave | Evidence File | QA Marker(s) | Golden / Negative Path | Environment | PR / Commit | Check Status | Reviewer / Owner | Closure Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| W0 | `modules/ALP/11-build/evidence/w0-foundation-scaffold.md` | governance-artifacts; architecture-inventory | Scaffold path | GitHub / Vercel | PR #71 | Accepted | BC-ALP-CONSOLIDATED-001 | Closed for scaffold scope | No full app delivery claim. |
| W1 | W1 evidence files | auth; security-privacy | Auth / profile / files | GitHub / Vercel | PR #73-#77 | Accepted | BC-ALP-CONSOLIDATED-001 | Closed for W1 scope | W2 entry authorized by PR #77. |
| W2 | W2 evidence files | GOV-ALP-078; GOV-ALP-079 | Dashboard / course / unit | GitHub / Vercel / screenshots | PR #78-#79 | Accepted | BC-ALP-CONSOLIDATED-001 | Closed for W2 scope | ALP-CTRL-010 carried forward. |
| W3 | W3 evidence files | GOV-ALP-080-083 | Progress and completion | GitHub / Vercel / Supabase | PR #80-#84 | Accepted | BC-ALP-CONSOLIDATED-001 | Closed for approved W3 scope | ALP-CTRL-011 closed. |
| W4 | `modules/ALP/11-build/evidence/20260702-W4-GOV-ALP-085-decision-enrolment-payments-entry.md` | GOV-ALP-085 | W4 entry and sequencing | GitHub | PR #85 | Merged | BC-ALP-CONSOLIDATED-001 | Entry merged; not closed | Establishes W4.1-W4.5 sequence. |
| W4.1 | `modules/ALP/11-build/evidence/20260702-W4-GOV-ALP-086-decision-enrolment-access-gating.md` | GOV-ALP-086; QA-ALP-241-244 | Enrolment gate | GitHub / Supabase | PR #86 | Merged | BC-ALP-CONSOLIDATED-001 | Implementation merged | Live proof followed. |
| W4.1 | `modules/ALP/11-build/evidence/20260707-W4-GOV-ALP-088-decision-enrolment-db-proof-closure.md` | GOV-ALP-088 | DB/RLS proof | Live Supabase | PR #88 | Merged | BC-ALP-CONSOLIDATED-001 | DB proof closed | No write policies verified. |
| W4.1 | `modules/ALP/11-build/evidence/20260710-W4-GOV-ALP-089-decision-w4-1-final-closure.md` | GOV-ALP-089 | UI proof hold | GitHub / Supabase | PR #89 | Merged | BC-ALP-CONSOLIDATED-001 | Final closure held | Browser proof required. |
| W4.1 | `modules/ALP/11-build/evidence/20260710-W4-GOV-ALP-091-decision-ui-proof-enabler.md` | GOV-ALP-091; QA-ALP-246-247 | Sign-out/navigation | GitHub / Vercel | PR #90 | Merged | BC-ALP-CONSOLIDATED-001 | Enabler merged | Navigation loop found later. |
| W4.1 | `modules/ALP/11-build/evidence/20260712-W4-GOV-ALP-092-decision-navigation-proof-prebuild.md` | GOV-ALP-092 | Navigation prebuild | User screenshots / governance | PR #91 | Merged | BC-ALP-CONSOLIDATED-001 | Prebuild merged | Narrow build authorized. |
| W4.1 | `modules/ALP/11-build/evidence/20260715-W4-GOV-ALP-093-decision-navigation-loop-breaker-build.md` | GOV-ALP-093; QA-ALP-248-251 | Sidebar and denied recovery | GitHub / Vercel / screenshots | PR #92 / `a0c0944a8399c97c90817916f74140c5369daede` | Merged; Vercel passed | Product-owner proof | Partial UI proof accepted; W4.1 open | Enrolled, pending, revoked and unknown proof remain. |
| W4.2 / W4.3-W4.5 roadmap | `modules/ALP/11-build/evidence/20260721-W4-GOV-ALP-094-decision-enrolment-catalogue-prebuild.md` | QA-ALP-252-267; reserved QA-ALP-268-276 | Catalogue/admin enrolment and payment roadmap | GitHub / schema inspection | PR #93 / `721be18e88d284ffffc4179e71e3dd936b14a319` | Merged; Vercel passed | Product owner / reviewer | Prebuild merged; implementation not started | W4.2 RED next; later payment gates preserved. |
| W4.2 | `modules/ALP/11-build/evidence/20260722-W4-GOV-ALP-095-decision-w4-2-executable-red.md` | QA-ALP-252-267 | Correct RED for absent catalogue/admin invitation/access management | Vitest / GitHub Actions | Current RED PR | Branch proof pending review | Product owner / reviewer | Executable RED filed; build blocked | No application code, migration or live role/enrolment write. |

---

## Current Non-Claims

Full app delivery: NOT CLAIMED.  
CODE_PASS: NOT CLAIMED.  
FUNCTIONAL_PASS: NOT CLAIMED.  
CWT_PASS: NOT CLAIMED.  
Deployment acceptance: NOT CLAIMED.  
Production readiness: NOT CLAIMED.  
Live payment readiness: NOT CLAIMED.  
ALP-CTRL-010: OPEN and carried forward.  
W4.1: FINAL CLOSURE NOT CLAIMED.  
W4.2: EXECUTABLE RED FILED; IMPLEMENTATION NOT STARTED.  
W4.3-W4.5: NOT STARTED; PAYMENT EXECUTION NOT AUTHORIZED.
