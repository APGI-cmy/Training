# BUILD PROGRESS TRACKER

**Module**: ALP (APGI Learning Portal)  
**Module Slug**: ALP  
**Last Updated**: 2026-07-10  
**Updated By**: GOV-ALP-091 W4.1 UI proof enabler  
> **Classification**: ACTIVE - W4.1 UI PROOF ENABLER FILED  
> **Repository**: APGI-cmy/Training  
> **Current Workstream**: W4.1 UI/browser proof enabler for enrolment access gating  
> **Next Required Action**: Review/merge UI-proof enabler PR; then capture W4.1 browser proof for enrolled access and denied states

---

## Current Executive Status

| Item | Status | Evidence |
|---|---|---|
| W0 Foundation / Scaffold | Closed for scaffold scope | PR #71 |
| W1 Closure / W2 Entry | Closed for W1 scope | PR #77 / `f492c8efd8c83cbca49481191315ac2869c62c3b` |
| W2 Dashboard / Course Shell / Unit Viewer | Closed for W2 scope | PR #79 / `1b2ae564437a90349ccca95138ac430bf680089b` |
| W3 Progress + Completion | Closed for approved W3 database-backed progress scope | PR #80 and PR #81 merged; PR #82 deployed UI proof only; PR #83 merged; PR #84 normalized post-merge evidence |
| W4 Enrolment + Payments | Entry merged; implementation started | PR #85 merged; W4.1 DB proof closed; W4.1 UI-proof enabler filed |
| W4.1 Enrolment state and access gating | UI-proof enabler filed; final closure still pending browser proof | PR #86 implementation merge; PR #88 DB proof closure merge; PR #89 UI proof hold; GOV-ALP-091 UI-proof enabler |

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
| Supabase database-progress source of truth | Database proof closed by PR #83 merge |

---

## W3 Database-Backed Proof Closed

| Proof Item | Status |
|---|---|
| PR #82 posture | Deployed UI proof only; did not close W3. |
| Live Supabase W3 progress migration | Applied and verified. |
| `public.progress_events` | Verified with `vpshr-level-0` / `introduction` proof row `unit_completed`. |
| `public.learner_progress` | Verified with `vpshr-level-0` / `introduction` proof row `completed`. |
| `public.completion_states` | Verified with `vpshr-level-0` / `introduction` proof state `1 of 13`, `7.69%`. |
| ALP-CTRL-011 posture | Closed by PR #83 merge. |

---

## W4 Entry Governance Filed

| Entry Item | Status |
|---|---|
| W4 entry evidence | Merged by PR #85. |
| W4 implementation | Started with W4.1 implementation PR. |
| Initial recommended slice | W4.1 Enrolment state and course access gating. |
| Payment gateway integration | Not authorized by W4.1. Requires later gateway decision and sandbox proof. |
| ALP-CTRL-010 | Open and carried forward. |

---

## W4.1 DB Proof Closed; UI Proof Pending

| Proof Item | Status |
|---|---|
| Enrolment table | Added as `public.course_enrolments` in migration `005_alp_enrolments_access.sql`. |
| Enrolment event table | Added as `public.course_enrolment_events` for audit trail. |
| Enrolment statuses | `pending`, `enrolled`, `revoked`; application treats missing row as `not_enrolled`. |
| Course shell gate implementation | `/learn/[courseSlug]` checks `getCourseAccess` before loading progress/course content. |
| Unit viewer gate implementation | `/learn/[courseSlug]/units/[unitSlug]` checks `getCourseAccess` before loading unit content. |
| Negative path implementation | `CourseAccessDenied` renders governed denied state. |
| Static QA | `tests/qa-to-red/alp/enrolment-access.spec.ts` added; UI-proof enabler markers QA-ALP-246 and QA-ALP-247 filed. |
| Live DB proof | Closed by PR #88 after connector validation. |
| UI-proof enabler | Filed by GOV-ALP-091; adds visible sign-out, clearer navigation, and route clarification. |
| UI/browser proof | Required after enabler deployment before final W4.1 closure. |
| W4.1 final closure | Not claimed. |

---

## W4.1 UI-Proof Enabler Filed

| Enabler Item | Status |
|---|---|
| Visible sign-out | Added global/header and profile sign-out control. |
| Sign-out redirect | Sign-out now returns to `/alp-sign-in`. |
| Dashboard navigation | Header, footer, and profile page provide clearer dashboard/profile/gated-course navigation. |
| Route clarification | Public `/courses/vpshr-level-0` landing identifies `/learn/vpshr-level-0` as the governed learner route. |
| Unit links | Unit cards now point to `/learn/vpshr-level-0/units/[unitSlug]`. |
| Final W4.1 closure | Still not claimed pending deployed browser proof. |

---

## W4.1 DB Proof Closed

| Proof Item | Status |
|---|---|
| Migration history | Verified `004_alp_progress_completion` and `005_alp_enrolments_access`. |
| `public.course_enrolments` | Exists; row-count smoke read succeeded. |
| `public.course_enrolment_events` | Exists; row-count smoke read succeeded. |
| RLS on `public.course_enrolments` | Verified enabled. |
| RLS on `public.course_enrolment_events` | Verified enabled. |
| Policy on `public.course_enrolments` | Verified `course_enrolments_select_self_or_admin`, `SELECT`. |
| Policy on `public.course_enrolment_events` | Verified `course_enrolment_events_select_self_or_admin`, `SELECT`. |
| Non-SELECT write policies | Verified absent on both W4.1 enrolment tables. |
| W4.1 DB proof closure | Closed by PR #88 merge. |
| W4 closure | Not claimed. |

---

## W4.1 UI Proof Still Required

| UI Proof Item | Required Evidence |
|---|---|
| Enrolled learner allowed | Browser proof that a learner with `course_enrolments.status = enrolled` can access the course shell and unit viewer. |
| Not enrolled denied | Browser proof that a learner with no enrolment row receives the governed access-denied state. |
| Pending denied | Browser proof that a learner with `course_enrolments.status = pending` receives the governed access-denied state. |
| Revoked denied | Browser proof that a learner with `course_enrolments.status = revoked` receives the governed access-denied state. |
| Error/unknown denied | Browser proof or controlled evidence that unresolved enrolment access does not expose gated course content. |

---

## W0-W9 Build Wave Status Table

| Wave | Planned Scope | Status | Evidence Link(s) | Merge / PR Status | Check Status | Blocker / Risk |
|---|---|---|---|---|---|---|
| W0 | Foundation / Scaffold | CLOSED FOR SCAFFOLD SCOPE | W0 evidence files | PR #71 and PR #72 merged | Checks accepted before merge | Full app delivery not claimed |
| W1 | Auth + Profile + Files | CLOSED FOR W1 SCOPE | W1 evidence files | PR #73-#77 merged | Checks accepted before merge | Admin console proof deferred |
| W2 | Dashboard + Course Shell + Unit Viewer | CLOSED FOR W2 SCOPE | W2 evidence files | PR #78 and PR #79 merged | Checks accepted before merge | ALP-CTRL-010 carried forward |
| W3 | Progress + Completion | CLOSED FOR APPROVED W3 SCOPE | W3 evidence files | PR #80 and PR #81 merged; PR #82 deployed UI proof only; PR #83 merged; PR #84 merged | PR #83 and PR #84 merged | ALP-CTRL-011 closed; ALP-CTRL-010 remains open |
| W4 | Enrolment + Payments | IMPLEMENTATION STARTED | W4/W4.1 evidence files including GOV-ALP-091 | PR #85, PR #86, PR #87, PR #88, and PR #89 merged; W4.1 UI-proof enabler PR pending | Checks pending | No payment readiness claim; W4.1 UI browser proof pending; W4.2 not started |
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
| ALP-CTRL-011 | Live Supabase progress tables must be applied or verified before database-backed progress becomes the long-term source of truth. | Closed by PR #83 | PR #83 records live migration verification for W3 progress source-of-truth tables. |

---

## Immediate Next Action

Review and merge the W4.1 UI-proof enabler PR. After deployment, capture W4.1 UI/browser proof for enrolled access and denied-state behaviour. File final W4.1 closure only after that proof is accepted.

---

## Build Authorization Posture

W1 Closure: CLOSED FOR W1 SCOPE  
W2 Closure: CLOSED FOR W2 SCOPE  
W3 Closure: CLOSED FOR APPROVED W3 SCOPE BY PR #83  
W4 Entry: MERGED BY PR #85  
W4 Start: IMPLEMENTATION STARTED  
W4.1 Implementation: MERGED BY PR #86  
W4.1 DB Proof Closure: MERGED BY PR #88  
W4.1 UI-Proof Enabler: FILED FOR REVIEW  
W4.1 UI Proof: REQUIRED BEFORE FINAL CLOSURE  
W4.1 Closure: NOT CLAIMED  
W4.2: NOT STARTED  
W4 Closure: NOT CLAIMED  
Full App Delivery: NOT CLAIMED  
CODE_PASS: NOT CLAIMED  
FUNCTIONAL_PASS: NOT CLAIMED  
CWT_PASS: NOT CLAIMED  
Final content quality acceptance: NOT CLAIMED  
Long-term database-backed progress source of truth: CLAIMED FOR W3 PROGRESS SCOPE ONLY  
Live payment readiness: NOT CLAIMED  
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
| 3.2 | 2026-07-01 | Filed W3 deployed UI proof and kept W3 open pending ALP-CTRL-011 DB proof. | AI-assisted draft | Merged by PR #82 as deployed UI proof only |
| 3.3 | 2026-07-02 | Filed W3 database-backed progress proof as the closure PR; kept PR #82 as deployed UI proof only and left W4 blocked until merge. | AI-assisted draft | Merged by PR #83 |
| 3.4 | 2026-07-02 | Normalized GOV-ALP-083 post-merge status header and tracker posture after PR #83 merge. | AI-assisted draft | Merged by PR #84 |
| 4.0 | 2026-07-02 | Filed W4 enrolment and payments entry governance. | AI-assisted draft | Merged by PR #85 |
| 4.1 | 2026-07-02 | Filed W4.1 enrolment state and course access gating implementation. | AI-assisted draft | Merged by PR #86 |
| 4.2 | 2026-07-07 | Filed W4.1 live DB table-existence proof after migration application. | AI-assisted draft | Merged by PR #87 |
| 4.3 | 2026-07-07 | Filed W4.1 DB proof closure after connector validation of tables, reads, RLS, policies, no write policies, and migration history. | AI-assisted draft | Merged by PR #88 |
| 4.4 | 2026-07-10 | Reframed W4.1 final closure as held pending required UI/browser proof. | AI-assisted draft | Merged by PR #89 |
| 4.5 | 2026-07-10 | Filed W4.1 UI-proof enabler for sign-out, clearer navigation, and governed route clarification. | AI-assisted draft | Filed for review |
