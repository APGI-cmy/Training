# BUILD PROGRESS TRACKER

**Module**: ALP (APGI Learning Portal)  
**Module Slug**: ALP  
**Last Updated**: 2026-07-22  
**Updated By**: PR #94 post-merge tracker normalization  
> **Classification**: ACTIVE - W4.2 BUILD AUTHORIZED  
> **Repository**: APGI-cmy/Training  
> **Current Workstream**: Open and execute the separate W4.2 build-to-green cycle  
> **Next Required Action**: Open a separate W4.2 build branch and implement only QA-ALP-252 through QA-ALP-267 to green

---

## Current Executive Status

| Item | Status | Evidence |
|---|---|---|
| W0 Foundation / Scaffold | Closed for scaffold scope | PR #71 |
| W1 Closure / W2 Entry | Closed for W1 scope | PR #77 / `f492c8efd8c83cbca49481191315ac2869c62c3b` |
| W2 Dashboard / Course Shell / Unit Viewer | Closed for W2 scope | PR #79 / `1b2ae564437a90349ccca95138ac430bf680089b` |
| W3 Progress + Completion | Closed for approved database-backed scope | PR #80-#84 |
| W4 Enrolment + Payments | Implementation started; not closed | PR #85 entry; W4.1 chain PR #86-#92; W4.2 prebuild PR #93 and RED PR #94 merged |
| W4.1 Access gating | DB proof closed; partial browser proof accepted; final closure pending | PR #88 DB closure; PR #92 merged; product-owner screenshots |
| W4.2 Manual/admin enrolment | Prebuild and executable RED merged; separate build authorized; implementation not started | PR #93 and PR #94 merged; GOV-ALP-095 accepted |
| W4.3 Payment status model | Roadmap requirements only; not started | GOV-ALP-085 sequence preserved by GOV-ALP-094 |
| W4.4 Provider integration decision | Not started | Architecture/security/risk decision required before execution |
| W4.5 Payment execution | Not started and not authorized | Blocked until W4.1-W4.4 accepted |

---

## W3 Deployed and Database Proof Accepted

| Proof Item | Status |
|---|---|
| Learner dashboard and unit progress UI | Accepted |
| Mark unit complete and confirmation | Accepted |
| Course/dashboard progress update | Accepted |
| Supabase progress source of truth | Closed by PR #83 |
| ALP-CTRL-011 | Closed by PR #83 |

---

## W4 Entry Governance

| Entry Item | Status |
|---|---|
| W4 entry evidence | Merged by PR #85. |
| Authoritative sequence | W4.1 access gating; W4.2 manual/admin enrolment; W4.3 payment status model; W4.4 provider decision; W4.5 payment execution. |
| Payment gateway execution | Not authorized before W4.4 acceptance and W4.5 sandbox scope. |
| ALP-CTRL-010 | Open and carried forward. |

---

## W4.1 DB Proof Closed; Browser Proof Partially Accepted

| Proof Item | Status |
|---|---|
| `course_enrolments` and `course_enrolment_events` | Exist and smoke-read verified. |
| Enrolment states | `pending`, `enrolled`, `revoked`; no row treated as not enrolled. |
| Course and unit route gates | Implemented and database-backed. |
| RLS and SELECT policies | Verified by PR #88. |
| Non-SELECT write policies | Verified absent for the W4.1 read-gating scope. |
| Navigation/sidebar loop-breaker | Merged by PR #92 / `a0c0944a8399c97c90817916f74140c5369daede`. |
| Vercel post-merge deployment | Passed. |
| Product-owner browser proof accepted | Sidebar on dashboard/profile; public/governed distinction; not-enrolled denial; recovery actions; narrow layout. |
| Remaining W4.1 proof | Enrolled, pending, revoked and unknown/error controlled proof. |
| W4.1 final closure | Not claimed. |

---

## W4.2 Prebuild and Executable RED

| Item | Status / Link |
|---|---|
| App Description addendum | `modules/ALP/00-app-description/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-addendum.md` |
| UX Workflow addendum | `modules/ALP/01-ux-workflow-wiring/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-workflows.md` |
| FRS addendum | `modules/ALP/02-frs/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-requirements.md` |
| Requirement Registry addendum | `modules/ALP/REQUIREMENT_REGISTRY_ADDENDA/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-registry.md` |
| Canonical Stage 6 expansion QA plan | `modules/ALP/05-qa-to-red/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-qa-plan.md` |
| Prebuild governance | GOV-ALP-094 merged by PR #93 / `721be18e88d284ffffc4179e71e3dd936b14a319` |
| Executable RED suite | `tests/qa-to-red/alp/w4-2-enrolment-catalogue-red.spec.ts` |
| Dedicated RED command | `npm run test:alp:w4-2:red` |
| Correct-RED workflow | `.github/workflows/alp-w4-2-red-proof.yml` |
| Exact-head proof | Passed on reviewed head `0f310793f2fbf792966632a11a7c6a9feb280d75`; PR #94 merged as `43e587ac651b687845c3406b2b31ab57fbf95e0e` |
| Executable RED evidence | `modules/ALP/11-build/evidence/20260722-W4-GOV-ALP-095-decision-w4-2-executable-red.md`; accepted by merged PR #94 |
| W4.2 implementation | Not started; now authorized only on a separate W4.2 build branch within QA-ALP-252 through QA-ALP-267. |
| Post-merge tracker addendum | `modules/ALP/BUILD_PROGRESS_TRACKER_ADDENDA/20260722-w4-2-executable-red-post-merge.md` |

### W4.2 Authorized scope after RED PR merge

- generic learner sidebar and multi-course catalogue;
- learner-specific course state and actions;
- admin-only navigation and authorization using the existing `admin` role;
- invitation/manual enrolment with reason, basis, scope, expiry and protected token;
- complimentary and externally-paid administrative enrolment bases;
- revocation/reinstatement and full audit trail;
- legacy-route inventory and tested redirects; and
- controlled assignment of `admin` to `johan.ras@apginc.ca` during implementation/proof only.

---

## Payment Roadmap Gate

| Slice | Scope | Status |
|---|---|---|
| W4.3 | Explicit payment status model and audit trail | Not started; no checkout or webhook authority. |
| W4.4 | Provider selection plus architecture, security, privacy and risk acceptance | Not started. |
| W4.5 | Sandbox payment execution, authoritative confirmation and later offer controls | Not started; blocked. |

Offer-code execution requires separate W4.5 or later commercial authorization and may not be treated as W4.3 authority.

---

## W0-W9 Build Wave Status Table

| Wave | Planned Scope | Status | Evidence / PR Status | Check Status | Blocker / Risk |
|---|---|---|---|---|---|
| W0 | Foundation / Scaffold | CLOSED FOR SCAFFOLD SCOPE | PR #71-#72 merged | Accepted | Full app delivery not claimed |
| W1 | Auth + Profile + Files | CLOSED FOR W1 SCOPE | PR #73-#77 merged | Accepted | Admin console proof deferred |
| W2 | Dashboard + Course Shell + Unit Viewer | CLOSED FOR W2 SCOPE | PR #78-#79 merged | Accepted | ALP-CTRL-010 carried forward |
| W3 | Progress + Completion | CLOSED FOR APPROVED W3 SCOPE | PR #80-#84 merged | Accepted | ALP-CTRL-010 remains open |
| W4 | Enrolment + Payments | IMPLEMENTATION STARTED | PR #85-#94 merged; separate W4.2 build PR not yet opened | Correct RED accepted; W4.2 build authorized | W4.1 final proof pending; W4.2 not built; W4.3-W4.5 not started |
| W5 | Assessment Submission | WAITING | No W5 PR | No checks | Requires W4 closure |
| W6 | AI Evaluation + Human Review | WAITING | No W6 PR | No checks | Requires W5 closure |
| W7 | Certificates | WAITING | No W7 PR | No checks | Requires W3/W6 closure |
| W8 | Admin Reports + Audit | WAITING | No W8 PR | No checks | Requires W1-W7 closure |
| W9 | Deployment + CWT | WAITING | No W9 PR | No checks | Requires W0-W8 closure |

---

## Active Controls

| Control ID | Control | Current Status | Required Next Action |
|---|---|---|---|
| ALP-CTRL-003 | Full app workflows not complete | Open | Complete W4-W9 implementation and evidence. |
| ALP-CTRL-004 | CODE_PASS not claimed | Open | Claim only after required code evidence exists. |
| ALP-CTRL-005 | FUNCTIONAL_PASS not claimed | Open | Claim only after functional evidence exists. |
| ALP-CTRL-006 | CWT_PASS not claimed | Open | Claim only after deployment/CWT evidence exists. |
| ALP-CTRL-010 | Legacy iSpring embedded video objects do not consistently play | Open | Inspect exported assets, MIME types and browser errors in later content hardening. |
| ALP-CTRL-011 | Live Supabase progress tables verified | Closed by PR #83 | No further W3 DB action unless regression is found. |

---

## Immediate Next Action

PR #94 has merged and the executable W4.2 QA-to-Red gate is accepted. Open a separate W4.2 build branch and implement only the authorized generic catalogue/sidebar, admin authorization, invitation/manual enrolment, revoke/reinstate and redirect-inventory scope. Build QA-ALP-252 through QA-ALP-267 to green while preserving all regression suites. W4.3-W4.5 payment work remains unauthorized.

---

## Build Authorization Posture

W1 Closure: CLOSED FOR W1 SCOPE  
W2 Closure: CLOSED FOR W2 SCOPE  
W3 Closure: CLOSED FOR APPROVED W3 SCOPE BY PR #83  
W4 Entry: MERGED BY PR #85  
W4.1 Implementation: MERGED BY PR #86  
W4.1 DB Proof Closure: MERGED BY PR #88  
W4.1 Navigation Build: MERGED BY PR #92  
W4.1 Browser Proof: PARTIALLY ACCEPTED; FINAL CLOSURE NOT CLAIMED  
W4.2 Prebuild: MERGED BY PR #93  
W4.2 Executable RED: MERGED BY PR #94 / `43e587ac651b687845c3406b2b31ab57fbf95e0e`  
W4.2 Implementation: NOT STARTED / AUTHORIZED ONLY ON A SEPARATE W4.2 BUILD BRANCH  
W4.3 Payment Status Model: NOT STARTED  
W4.4 Provider Decision: NOT STARTED  
W4.5 Payment Execution: NOT STARTED / NOT AUTHORIZED  
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
| 5.0 | 2026-07-22 | Normalized PR #94 merged posture and authorized the separate W4.2 build-to-green cycle without claiming implementation. | AI-assisted draft | Merged by PR #95 |
| 1.7 | 2026-06-29 | Filed W1 closure and W2 entry authorization. | AI-assisted draft | Merged by PR #77 |
| 2.0 | 2026-06-29 | Filed W2 dashboard/course shell/unit viewer implementation slice. | AI-assisted draft | Merged by PR #78 |
| 2.1 | 2026-06-30 | Filed W2 deployed proof closure and carried ALP-CTRL-010 forward. | AI-assisted draft | Merged by PR #79 |
| 3.0 | 2026-06-30 | Filed W3 progress/completion implementation slice. | AI-assisted draft | Merged by PR #80 |
| 3.1 | 2026-07-01 | Filed W3 progress proof fix after browser proof showed progress did not visibly update. | AI-assisted draft | Merged by PR #81 |
| 3.2 | 2026-07-01 | Filed W3 deployed UI proof while DB proof remained open. | AI-assisted draft | Merged by PR #82 |
| 3.3 | 2026-07-02 | Filed W3 database-backed progress closure. | AI-assisted draft | Merged by PR #83 |
| 3.4 | 2026-07-02 | Normalized W3 post-merge evidence. | AI-assisted draft | Merged by PR #84 |
| 4.0 | 2026-07-02 | Filed W4 enrolment and payments entry governance and W4.1-W4.5 sequence. | AI-assisted draft | Merged by PR #85 |
| 4.1 | 2026-07-02 | Filed W4.1 enrolment access gating implementation. | AI-assisted draft | Merged by PR #86 |
| 4.2 | 2026-07-07 | Filed W4.1 live DB table-existence proof. | AI-assisted draft | Merged by PR #87 |
| 4.3 | 2026-07-07 | Filed W4.1 DB proof closure. | AI-assisted draft | Merged by PR #88 |
| 4.4 | 2026-07-10 | Held W4.1 final closure pending browser proof. | AI-assisted draft | Merged by PR #89 |
| 4.5 | 2026-07-10 | Filed W4.1 UI-proof enabler. | AI-assisted draft | Merged by PR #90 |
| 4.6 | 2026-07-13 | Filed W4.1 navigation/sidebar prebuild after loop finding. | AI-assisted draft | Merged by PR #91 |
| 4.7 | 2026-07-15 | Filed W4.1 persistent sidebar and loop-breaker build. | AI-assisted draft | Merged by PR #92 |
| 4.8 | 2026-07-21 | Filed W4.2 enrolment/catalogue prebuild and preserved W4.3-W4.5 payment gates. | AI-assisted draft | Merged by PR #93 |
| 4.9 | 2026-07-22 | Filed executable QA-ALP-252 through QA-ALP-267 and exact-head correct-RED proof. | AI-assisted draft | Filed for review in PR #94 |
