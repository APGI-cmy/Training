# BUILD PROGRESS TRACKER

**Module**: ALP (APGI Learning Portal)  
**Module Slug**: ALP  
**Last Updated**: 2026-07-01  
**Updated By**: W3 deployed UI proof filing  
> **Classification**: ACTIVE - W3 DEPLOYED UI PROOF FILED; DATABASE PROOF REQUIRED  
> **Repository**: APGI-cmy/Training  
> **Current Workstream**: W3 Progress + Completion database proof  
> **Next Required Action**: Apply or verify live Supabase progress tables before W3 closure and W4 entry

---

## Current Executive Status

| Item | Status | Evidence |
|---|---|---|
| W0 Foundation / Scaffold | Closed for scaffold scope | PR #71 |
| W1 Closure / W2 Entry | Closed for W1 scope | PR #77 / `f492c8efd8c83cbca49481191315ac2869c62c3b` |
| W2 Dashboard / Course Shell / Unit Viewer | Closed for W2 scope | PR #79 / `1b2ae564437a90349ccca95138ac430bf680089b` |
| W3 Progress + Completion | Deployed UI proof filed; DB proof required | PR #80 and PR #81 merged; PR #82 pending |
| W4 Enrolment + Payments | Waiting | Requires W3 closure after DB proof |

---

## W3 Deployed UI Proof Accepted

| Proof Item | Status |
|---|---|
| Learner dashboard progress-enabled view | Accepted |
| Unit viewer progress controls | Accepted |
| Mark unit complete action | Accepted |
| Completion confirmation message | Accepted |
| Course shell progress update | Accepted |
| Dashboard progress update | Accepted |
| Supabase database-progress source of truth | Blocking W3 closure as ALP-CTRL-011 |

---

## W0-W9 Build Wave Status Table

| Wave | Planned Scope | Status | Evidence Link(s) | Merge / PR Status | Check Status | Blocker / Risk |
|---|---|---|---|---|---|---|
| W0 | Foundation / Scaffold | CLOSED FOR SCAFFOLD SCOPE | W0 evidence files | PR #71 and PR #72 merged | Checks accepted before merge | Full app delivery not claimed |
| W1 | Auth + Profile + Files | CLOSED FOR W1 SCOPE | W1 evidence files | PR #73-#77 merged | Checks accepted before merge | Admin console proof deferred |
| W2 | Dashboard + Course Shell + Unit Viewer | CLOSED FOR W2 SCOPE | W2 evidence files | PR #78 and PR #79 merged | Checks accepted before merge | ALP-CTRL-010 carried forward |
| W3 | Progress + Completion | DB PROOF REQUIRED BEFORE CLOSURE | `modules/ALP/11-build/evidence/20260701-W3-GOV-ALP-082-decision-deployed-proof-closure.md` | PR #80 and PR #81 merged; PR #82 pending | Pending PR checks | ALP-CTRL-011 blocking closure |
| W4 | Enrolment + Payments | WAITING | Pending W4 evidence | No W4 PR yet | No checks run | Requires W3 closure after DB proof |
| W5 | Assessment Submission | WAITING | Pending W5 evidence | No W5 PR yet | No checks run | Requires W1/W3/W4 closure |
| W6 | AI Evaluation + Human Review | WAITING | Pending W6 evidence | No W6 PR yet | No checks run | Requires W5 closure |
| W7 | Certificates | WAITING | Pending W7 evidence | No W7 PR yet | No checks run | Requires W3/W6 closure |
| W8 | Admin Reports + Audit | WAITING | Pending W8 evidence | No W8 PR yet | No checks run | Requires W1-W7 closure |
| W9 | Deployment + CWT | WAITING | Pending W9 evidence | No W9 PR yet | No checks run | Requires W0-W8 closure |

---

## Active Controls

| Control ID | Control | Current Status | Required Next Action |
|---|---|---|---|
| ALP-CTRL-003 | Full app workflows not complete | Open | Complete W4-W9 implementation and evidence after W3 closure. |
| ALP-CTRL-004 | CODE_PASS not claimed | Open | Claim only after code evidence exists. |
| ALP-CTRL-005 | FUNCTIONAL_PASS not claimed | Open | Claim only after functional evidence exists. |
| ALP-CTRL-006 | CWT_PASS not claimed | Open | Claim only after deployment/CWT evidence exists. |
| ALP-CTRL-010 | Legacy iSpring embedded video objects do not consistently play. | Open | Inspect exported iSpring asset references, video file availability, MIME type, and browser errors. Owner wave: W3 content-hardening or later content QA. |
| ALP-CTRL-011 | Live Supabase progress tables must be applied or verified before database-backed progress becomes the long-term source of truth. | Blocking W3 closure | Apply or verify W3 progress migration tables and capture database-backed progress proof before W4 entry. |

---

## Immediate Next Action

Apply or verify live Supabase progress tables and capture database-backed progress proof. Do not start W4 until W3 closure is filed after that proof.

---

## Build Authorization Posture

W1 Closure: CLOSED FOR W1 SCOPE  
W2 Closure: CLOSED FOR W2 SCOPE  
W3 Closure: NOT CLAIMED  
W4 Start: NOT AUTHORIZED  
Full App Delivery: NOT CLAIMED  
CODE_PASS: NOT CLAIMED  
FUNCTIONAL_PASS: NOT CLAIMED  
CWT_PASS: NOT CLAIMED  
Final content quality acceptance: NOT CLAIMED  
Long-term database-backed progress source of truth: NOT CLAIMED until ALP-CTRL-011 is closed  
Deployment acceptance: NOT CLAIMED  
Production readiness: NOT CLAIMED

---

## Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 1.7 | 2026-06-29 | Filed W1 closure and W2 entry authorization. | AI-assisted draft | Merged by PR #77 |
| 2.0 | 2026-06-29 | Filed W2 dashboard/course shell/unit viewer implementation slice. | AI-assisted draft | Merged by PR #78 |
| 2.1 | 2026-06-30 | Filed W2 deployed proof closure and carried ALP-CTRL-010 forward. | AI-assisted draft | Merged by PR #79 |
| 3.0 | 2026-06-30 | Filed W3 progress/completion implementation slice. | AI-assisted draft | Merged by PR #80 |
| 3.1 | 2026-07-01 | Filed W3 progress proof fix after reviewer browser proof showed progress did not visibly update. | AI-assisted draft | Merged by PR #81 |
| 3.2 | 2026-07-01 | Filed W3 deployed UI proof and kept W3 open pending ALP-CTRL-011 DB proof. | AI-assisted draft | Filed for review |
