# APGI Learning Portal - Build Readiness Remediation Plan

## Status Header

| Field | Value |
|---|---|
| Artifact | Build Readiness Remediation Plan |
| Module | ALP - APGI Learning Portal |
| Stage Context | Post-Stage 12 blocked build authorization readiness |
| Version | 0.1 |
| Status | Draft - remediation plan filed; build remains blocked |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/11-build/build-readiness-remediation-plan.md |
| Prepared Date | 2026-06-11 |
| Prepared By | AI-assisted draft (filed for review; requires Foreman/Governance human sign-off) |
| Upstream Stage 12 Scaffold | modules/ALP/11-build/build-authorization.md |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This remediation plan converts the blocked Stage 12 Build Authorization readiness record into an actionable blocker-clearance plan.

The Stage 12 scaffold records that build cannot start because formal builder appointment, acknowledgements, assurance/advisory status, carry-forward artifact verification, Runtime/Deployment Contract, Golden Path Verification Pack, and build tracker readiness remain incomplete.

This plan does not authorize implementation. It defines the work required before a future Foreman Build Authorization can be issued.

---

## 2. Current Build Governance Position

| Item | Status |
|---|---|
| Stage 12 Build Authorization scaffold | Filed |
| Stage 12 gate passed | No |
| Formal builder appointment | Blocked |
| Build authorization | Blocked |
| Implementation authorization | Blocked |
| First build wave start | Blocked |

Build may not begin until every remediation item in this plan is either completed with evidence or formally escalated as a blocking condition.

---

## 3. Remediation Workstreams

| Workstream | Objective | Output Artifact / Evidence | Build Impact |
|---|---|---|---|
| WS-01 Builder Appointment Completion | Convert Stage 11 scaffold into real appointment record | updated `modules/ALP/10-builder-appointment/builder-appointment.md` | Blocks build until complete |
| WS-02 Stage 9 Builder Checklist PASS Evidence | Record checklist PASS evidence for every appointed builder | updated Stage 9 checklist or linked acknowledgement evidence | Blocks build until complete |
| WS-03 Stage 10 IAA Acknowledgement Completion | Record Foreman and builder acknowledgements | updated Stage 10 IAA pre-brief or linked acknowledgement evidence | Blocks build until complete |
| WS-04 Assurance / Advisory Recording | Record ASSURANCE-TOKEN or PHASE_A_ADVISORY | token/advisory reference filed in Stage 10/11 | Blocks build until complete |
| WS-05 Carry-Forward Artifact Verification | Verify/file Stage 2-5 and Requirement Registry on main | verification log and missing artifact PRs if required | Blocks appointment/build until complete |
| WS-06 QA-ALP Range Status | Confirm module-local acceptance or canonical registration | QA range decision record | Blocks build until complete |
| WS-07 Runtime/Deployment Contract | Define target runtime, env, secrets names, auth assumptions, data prerequisites, external dependencies, health checks | `modules/ALP/11-build/runtime-deployment-contract.md` | Required before W0 |
| WS-08 Golden Path Verification Pack | Define product-owner-verifiable journeys and pass/fail criteria | `modules/ALP/11-build/golden-path-verification-pack.md` | Required before W0 |
| WS-09 Build Tracker Initialization | Create ALP build tracker with wave status and evidence links | `modules/ALP/BUILD_PROGRESS_TRACKER.md` | Required before W0 |
| WS-10 Evidence Folder Confirmation | Confirm evidence locations for wave closure proofs | evidence directory inventory or README | Required before W0 |
| WS-11 Final Build Authorization Update | Convert Stage 12 blocked scaffold into explicit build authorization only after all blockers clear | updated `modules/ALP/11-build/build-authorization.md` | Final gate before build |

---

## 4. Detailed Remediation Checklist

### WS-01 - Builder Appointment Completion

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-01-001 | Identify named builder or agent for each appointed wave | appointment register row | Pending |
| WS-01-002 | Link current builder contract for every appointed builder | contract path/link | Pending |
| WS-01-003 | Assign wave scope boundaries per builder | appointment scope declaration | Pending |
| WS-01-004 | Assign RED QA boundaries per builder | QA boundary declaration | Pending |
| WS-01-005 | Assign evidence boundaries per builder | evidence boundary declaration | Pending |
| WS-01-006 | Record Foreman appointment decision | formal appointment row | Pending |

Completion rule:

```text
WS-01 is complete only when Stage 11 has named builders and formal Foreman appointment decisions for all appointed scope.
```

---

### WS-02 - Stage 9 Builder Checklist PASS Evidence

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-02-001 | Complete builder contract current check | Stage 9 checklist update | Pending |
| WS-02-002 | Record canon acknowledgement per builder | acknowledgement evidence | Pending |
| WS-02-003 | Record wave-by-wave scope understanding | signed scope statement | Pending |
| WS-02-004 | Record RED QA suite understanding | QA acknowledgement | Pending |
| WS-02-005 | Record architecture/TRS/FRS understanding | requirement acknowledgement | Pending |
| WS-02-006 | Record dependency blocker acknowledgement | dependency statement | Pending |
| WS-02-007 | Record STOP-AND-FIX / evidence / merge gate acknowledgement | protocol acknowledgement | Pending |
| WS-02-008 | Record Foreman role-fit decision | Stage 9 role-fit matrix | Pending |

Completion rule:

```text
WS-02 is complete only when every appointed builder has Stage 9 PASS evidence.
```

---

### WS-03 - Stage 10 IAA Acknowledgement Completion

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-03-001 | Record Foreman receipt of IAA pre-brief | Stage 10 acknowledgement table | Pending |
| WS-03-002 | Record Foreman confirmation that briefing is complete enough for builder acknowledgement | Stage 10 acknowledgement table | Pending |
| WS-03-003 | Record builder receipt of IAA pre-brief | builder acknowledgement register | Pending |
| WS-03-004 | Record builder acknowledgement of assigned wave acceptance criteria | builder acknowledgement register | Pending |
| WS-03-005 | Record builder acknowledgement of evidence obligations | builder acknowledgement register | Pending |
| WS-03-006 | Record builder acknowledgement that build remains blocked until explicit authorization | builder acknowledgement register | Pending |

Completion rule:

```text
WS-03 is complete only when Foreman and every appointed builder have acknowledged Stage 10.
```

---

### WS-04 - Assurance / Advisory Recording

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-04-001 | Determine whether ASSURANCE-TOKEN or PHASE_A_ADVISORY applies | IAA decision record | Pending |
| WS-04-002 | Record token/advisory identifier | Stage 10 or Stage 11 update | Pending |
| WS-04-003 | Record any advisory constraints as build blockers or conditions | advisory condition table | Pending |

Completion rule:

```text
WS-04 is complete only when token/advisory status is explicitly recorded and any conditions are mapped to build gates.
```

---

### WS-05 - Carry-Forward Artifact Verification

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-05-001 | Verify Stage 2 UX Workflow & Wiring Spec exists on main | file path and commit reference | Pending |
| WS-05-002 | Verify Stage 3 FRS exists on main | file path and commit reference | Pending |
| WS-05-003 | Verify Stage 4 TRS exists on main | file path and commit reference | Pending |
| WS-05-004 | Verify Stage 5 Architecture v0.2 exists on main | file path and commit reference | Pending |
| WS-05-005 | Verify Requirement Registry exists on main | file path and commit reference | Pending |
| WS-05-006 | File missing artifacts or create explicit blocker issues | PR/issue references | Pending |

Completion rule:

```text
WS-05 is complete only when every carry-forward artifact is verified on main or explicitly remains build-blocking.
```

---

### WS-06 - QA-ALP Range Status

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-06-001 | Confirm whether QA-ALP IDs are accepted module-locally | governance decision record | Pending |
| WS-06-002 | If canonical registration is required, file/register QA-ALP range | registry update PR | Pending if required |
| WS-06-003 | Link QA-ALP decision to Stage 6, Stage 8, and Stage 12 | cross-reference update | Pending |

Completion rule:

```text
WS-06 is complete only when QA-ALP ID governance is resolved and linked.
```

---

### WS-07 - Runtime/Deployment Contract

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-07-001 | Define deployment target and environment | runtime contract | Pending |
| WS-07-002 | List environment variable and secret names, not values | runtime contract | Pending |
| WS-07-003 | Define authentication/session assumptions | runtime contract | Pending |
| WS-07-004 | Define Supabase schema/table/function prerequisites | runtime contract | Pending |
| WS-07-005 | Define external dependencies: Vercel, Supabase, Stripe, AIMC, email/fallback | runtime contract | Pending |
| WS-07-006 | Define health/readiness/smoke verification expectations | runtime contract | Pending |
| WS-07-007 | Define seeded user/role conditions | runtime contract | Pending |

Planned output:

```text
modules/ALP/11-build/runtime-deployment-contract.md
```

---

### WS-08 - Golden Path Verification Pack

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-08-001 | Define learner enrolment golden path | golden path pack | Pending |
| WS-08-002 | Define learner course/progress golden path | golden path pack | Pending |
| WS-08-003 | Define assessment/AI/review golden path | golden path pack | Pending |
| WS-08-004 | Define certificate golden path | golden path pack | Pending |
| WS-08-005 | Define admin/report/audit golden path | golden path pack | Pending |
| WS-08-006 | Map each golden path to QA-to-Red scenarios | golden path pack | Pending |
| WS-08-007 | Define pass/fail criteria for each golden path | golden path pack | Pending |

Planned output:

```text
modules/ALP/11-build/golden-path-verification-pack.md
```

---

### WS-09 - Build Tracker Initialization

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-09-001 | Create ALP build tracker | build tracker file | Pending |
| WS-09-002 | Add W0-W9 wave status rows | build tracker file | Pending |
| WS-09-003 | Add evidence link columns | build tracker file | Pending |
| WS-09-004 | Add merge/check status columns | build tracker file | Pending |
| WS-09-005 | Add blocker/risk columns | build tracker file | Pending |

Planned output:

```text
modules/ALP/BUILD_PROGRESS_TRACKER.md
```

---

### WS-10 - Evidence Folder Confirmation

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-10-001 | Confirm evidence root path | evidence README or inventory | Pending |
| WS-10-002 | Define W0-W9 evidence subpaths | evidence README or inventory | Pending |
| WS-10-003 | Define naming convention for proof files | evidence README or inventory | Pending |
| WS-10-004 | Define required evidence index format | evidence README or inventory | Pending |

Planned output:

```text
.agent-admin/evidence/ALP/README.md
```

---

### WS-11 - Final Build Authorization Update

| Item | Required Action | Evidence | Status |
|---|---|---|---|
| WS-11-001 | Confirm WS-01 through WS-10 complete | remediation closure checklist | Pending |
| WS-11-002 | Update Stage 12 Build Authorization from BLOCKED to authorized only if complete | updated build authorization artifact | Pending |
| WS-11-003 | Record explicit Foreman Build Authorization | authorization decision | Pending |
| WS-11-004 | Confirm W0 can begin | W0 start decision | Pending |

Completion rule:

```text
WS-11 may not begin until WS-01 through WS-10 are complete.
```

---

## 5. Execution Order

The remediation work must execute in this order:

1. WS-05 Carry-Forward Artifact Verification;
2. WS-06 QA-ALP Range Status;
3. WS-07 Runtime/Deployment Contract;
4. WS-08 Golden Path Verification Pack;
5. WS-09 Build Tracker Initialization;
6. WS-10 Evidence Folder Confirmation;
7. WS-01 Builder Appointment Completion;
8. WS-02 Stage 9 Builder Checklist PASS Evidence;
9. WS-03 Stage 10 IAA Acknowledgement Completion;
10. WS-04 Assurance / Advisory Recording;
11. WS-11 Final Build Authorization Update.

This order ensures the builders are appointed only after the product, runtime, evidence, and verification basis is complete.

---

## 6. Stop Conditions

Remediation must stop and escalate if any of the following occurs:

- an upstream artifact is missing from `main` and cannot be verified;
- QA-ALP ID status cannot be resolved;
- Runtime/Deployment Contract cannot be defined without secrets or missing external access;
- Golden Path Verification cannot be mapped to QA-to-Red scenarios;
- no suitable builder can be appointed;
- Stage 9 or Stage 10 acknowledgements cannot be completed;
- IAA returns a blocking PHASE_A_ADVISORY;
- any governance record would need to falsely mark a blocked item as passed.

---

## 7. Remediation Exit Criteria

This remediation plan is complete only when:

- all workstreams WS-01 through WS-11 are complete;
- all required output artifacts are filed on `main`;
- Stage 11 has formal builder appointments;
- Stage 9 and Stage 10 acknowledgements are complete;
- ASSURANCE-TOKEN or PHASE_A_ADVISORY is recorded;
- Runtime/Deployment Contract is filed;
- Golden Path Verification Pack is filed;
- Build Tracker is initialized;
- Evidence folder conventions are filed;
- Stage 12 Build Authorization is explicitly updated by Foreman.

---

## 8. Current Decision

```text
Build Readiness Remediation Plan: FILED FOR REVIEW.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

This plan creates the route to unblock build later. It does not itself unblock build.

---

## 9. Proxy Sign-Off

I, ChatGPT acting as Product Owner / Foreman / Governance proxy at user request, record that this remediation plan maps the remaining Stage 12 blockers into actionable workstreams and evidence outputs.

I do not authorize build or implementation.

---

## 10. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-11 | Initial build readiness remediation plan created after blocked Stage 12 scaffold merge. | AI-assisted draft (pending Foreman review) | Filed for review; build remains blocked |
