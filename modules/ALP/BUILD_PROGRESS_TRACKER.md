# BUILD PROGRESS TRACKER

**Module**: ALP (APGI Learning Portal)  
**Module Slug**: ALP  
**Last Updated**: 2026-06-29  
**Updated By**: W2 dashboard / course shell / unit viewer slice filing  
> **Classification**: ACTIVE - W2 IMPLEMENTATION SLICE FILED FOR REVIEW  
> **Repository**: APGI-cmy/Training  
> **Current Workstream**: W2 Dashboard + Course Shell + Unit Viewer  
> **Next Required Action**: Review PR #78 and complete deployed W2 browser proof after merge

---

## Current Executive Status

| Item | Status | Evidence |
|---|---|---|
| W0 Foundation / Scaffold | Closed for scaffold scope | PR #71 |
| W1 Closure / W2 Entry | Merged | PR #77 / `f492c8efd8c83cbca49481191315ac2869c62c3b` |
| W2 Dashboard / Course Shell / Unit Viewer | Filed for review | PR #78 pending |

---

## W2 Scope in Current Slice

| Scope Item | Status |
|---|---|
| Learner dashboard route | Added |
| Dashboard course cards | Added |
| Course shell route | Added as generic /learn/[courseSlug] route |
| Course shell sidebar | Added |
| Unit viewer route | Added as generic /learn/[courseSlug]/units/[unitSlug] route |
| Unit iframe/fallback links | Added |
| Course metadata schema | Added |
| VPSHR Level 0 seed metadata | Added |
| W2 browser proof | Pending after merge/deploy |

---

## W0-W9 Build Wave Status Table

| Wave | Planned Scope | Status | Evidence Link(s) | Merge / PR Status | Check Status | Blocker / Risk |
|---|---|---|---|---|---|---|
| W0 | Foundation / Scaffold | CLOSED FOR SCAFFOLD SCOPE | W0 evidence files | PR #71 and PR #72 merged | Checks accepted before merge | Full app delivery not claimed |
| W1 | Auth + Profile + Files | CLOSED FOR W1 SCOPE | W1 evidence files | PR #73-#77 merged | Checks accepted before merge | Admin console proof deferred |
| W2 | Dashboard + Course Shell + Unit Viewer | FILED FOR REVIEW | `modules/ALP/11-build/evidence/20260629-W2-GOV-ALP-078-decision-dashboard-course-shell-unit-viewer.md` | PR #78 pending | Pending PR checks | Browser proof required after merge |
| W3 | Progress + Completion | WAITING | Pending W3 evidence | No W3 PR yet | No checks run | Requires W2 closure |
| W4 | Enrolment + Payments | WAITING | Pending W4 evidence | No W4 PR yet | No checks run | Requires W1/W2 closure |
| W5 | Assessment Submission | WAITING | Pending W5 evidence | No W5 PR yet | No checks run | Requires W1/W3/W4 closure |
| W6 | AI Evaluation + Human Review | WAITING | Pending W6 evidence | No W6 PR yet | No checks run | Requires W5 closure |
| W7 | Certificates | WAITING | Pending W7 evidence | No W7 PR yet | No checks run | Requires W3/W6 closure |
| W8 | Admin Reports + Audit | WAITING | Pending W8 evidence | No W8 PR yet | No checks run | Requires W1-W7 closure |
| W9 | Deployment + CWT | WAITING | Pending W9 evidence | No W9 PR yet | No checks run | Requires W0-W8 closure |

---

## Active Controls

| Control ID | Control | Current Status | Required Next Action |
|---|---|---|---|
| ALP-CTRL-003 | Full app workflows not complete | Open | Complete W2-W9 implementation and evidence. |
| ALP-CTRL-004 | CODE_PASS not claimed | Open | Claim only after code evidence exists. |
| ALP-CTRL-005 | FUNCTIONAL_PASS not claimed | Open | Claim only after functional evidence exists. |
| ALP-CTRL-006 | CWT_PASS not claimed | Open | Claim only after deployment/CWT evidence exists. |
| ALP-CTRL-009 | W2 browser proof not accepted | Open | Complete dashboard, course shell, and unit viewer browser proof after merge. |

---

## Immediate Next Action

```text
Review and merge PR #78, then complete W2 deployed browser proof.
```

---

## Build Authorization Posture

```text
W1 Closure: CLOSED FOR W1 SCOPE
W2 Start: FILED FOR REVIEW
W2 Closure: NOT CLAIMED
Full App Delivery: NOT CLAIMED
CODE_PASS: NOT CLAIMED
FUNCTIONAL_PASS: NOT CLAIMED
CWT_PASS: NOT CLAIMED
Deployment acceptance: NOT CLAIMED
Production readiness: NOT CLAIMED
```

---

## Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 1.7 | 2026-06-29 | Filed W1 closure and W2 entry authorization. | AI-assisted draft | Merged by PR #77 |
| 2.0 | 2026-06-29 | Filed W2 dashboard/course shell/unit viewer implementation slice. | AI-assisted draft | Filed for review |

