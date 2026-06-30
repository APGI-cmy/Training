# BUILD PROGRESS TRACKER

**Module**: ALP (APGI Learning Portal)  
**Module Slug**: ALP  
**Last Updated**: 2026-06-30  
**Updated By**: W3 progress / completion entry filing  
> **Classification**: ACTIVE - W3 PROGRESS COMPLETION FILED FOR REVIEW  
> **Repository**: APGI-cmy/Training  
> **Current Workstream**: W3 Progress + Completion  
> **Next Required Action**: Review PR #80 and complete deployed W3 browser proof after merge

---

## Current Executive Status

| Item | Status | Evidence |
|---|---|---|
| W0 Foundation / Scaffold | Closed for scaffold scope | PR #71 |
| W1 Closure / W2 Entry | Closed for W1 scope | PR #77 / `f492c8efd8c83cbca49481191315ac2869c62c3b` |
| W2 Dashboard / Course Shell / Unit Viewer | Closed for W2 scope | PR #79 / `1b2ae564437a90349ccca95138ac430bf680089b` |
| W3 Progress + Completion | Filed for review | PR #80 pending |

---

## W3 Scope in Current Slice

| Scope Item | Status |
|---|---|
| `progress_events` table | Added |
| `learner_progress` table | Added |
| `completion_states` table | Added |
| Self-scoped RLS for progress tables | Added |
| Idempotent progress event action | Added |
| Unit completed action | Added |
| Dashboard progress updates | Added |
| Course shell/sidebar progress updates | Added |
| Next learning action service | Added |
| Certificate eligibility pre-check hook | Added |
| Automatic unit-opened event from page render | Deferred |
| W3 browser proof | Pending after merge/deploy |

---

## W0-W9 Build Wave Status Table

| Wave | Planned Scope | Status | Evidence Link(s) | Merge / PR Status | Check Status | Blocker / Risk |
|---|---|---|---|---|---|---|
| W0 | Foundation / Scaffold | CLOSED FOR SCAFFOLD SCOPE | W0 evidence files | PR #71 and PR #72 merged | Checks accepted before merge | Full app delivery not claimed |
| W1 | Auth + Profile + Files | CLOSED FOR W1 SCOPE | W1 evidence files | PR #73-#77 merged | Checks accepted before merge | Admin console proof deferred |
| W2 | Dashboard + Course Shell + Unit Viewer | CLOSED FOR W2 SCOPE | W2 evidence files | PR #78 and PR #79 merged | Checks accepted before merge | ALP-CTRL-010 carried forward |
| W3 | Progress + Completion | FILED FOR REVIEW | `modules/ALP/11-build/evidence/20260630-W3-GOV-ALP-080-decision-progress-completion-entry.md` | PR #80 pending | Pending PR checks | Browser proof required after merge |
| W4 | Enrolment + Payments | WAITING | Pending W4 evidence | No W4 PR yet | No checks run | Requires W1/W2/W3 closure |
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
| ALP-CTRL-010 | Legacy iSpring embedded video objects do not consistently play. | Open | Inspect exported iSpring asset references, video file availability, MIME type, and browser errors. Owner wave: W2 follow-up or W3 content-hardening. |

---

## Immediate Next Action

Review PR #80. After merge, complete deployed W3 browser proof for completed progress state.

---

## Build Authorization Posture

W1 Closure: CLOSED FOR W1 SCOPE  
W2 Closure: CLOSED FOR W2 SCOPE  
W3 Start: FILED FOR REVIEW  
W3 Closure: NOT CLAIMED  
Full App Delivery: NOT CLAIMED  
CODE_PASS: NOT CLAIMED  
FUNCTIONAL_PASS: NOT CLAIMED  
CWT_PASS: NOT CLAIMED  
Final content quality acceptance: NOT CLAIMED  
Deployment acceptance: NOT CLAIMED  
Production readiness: NOT CLAIMED

---

## Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 1.7 | 2026-06-29 | Filed W1 closure and W2 entry authorization. | AI-assisted draft | Merged by PR #77 |
| 2.0 | 2026-06-29 | Filed W2 dashboard/course shell/unit viewer implementation slice. | AI-assisted draft | Merged by PR #78 |
| 2.1 | 2026-06-30 | Filed W2 deployed proof closure and carried ALP-CTRL-010 forward. | AI-assisted draft | Merged by PR #79 |
| 3.0 | 2026-06-30 | Filed W3 progress/completion implementation slice. | AI-assisted draft | Filed for review |
