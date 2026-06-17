# BUILD PROGRESS TRACKER

**Module**: ALP (APGI Learning Portal)  
**Module Slug**: ALP  
**Last Updated**: 2026-06-16  
**Updated By**: WS-08 Golden Path Verification Pack filing and ALP progress tracker initialization  
> **Classification**: ACTIVE - PRE-BUILD REMEDIATION IN PROGRESS - WS-08 FILED FOR REVIEW - BUILD BLOCKED  
> **Repository**: APGI-cmy/Training  
> **Tracker Location**: `modules/ALP/BUILD_PROGRESS_TRACKER.md`  
> **Current Workstream**: WS-08 - Golden Path Verification Pack  
> **Next Workstream**: WS-10 - Evidence Folder Convention

---

## Current Executive Status

ALP is in pre-build remediation. Stages 1 through 6 have now been filed at canonical module paths, the Requirement Registry is filed, WS-06 QA range status is confirmed module-local, and WS-07 Runtime / Deployment Contract is filed.

WS-08 Golden Path Verification Pack is being filed for review in the same PR that initializes this tracker.

No builder has been appointed. No build has been authorized. No implementation has been authorized.

```text
Builder Appointment: BLOCKED
Build Authorization: BLOCKED
Implementation: BLOCKED
Current stage/workstream: WS-08 Golden Path Verification Pack filed for review
Next stage/workstream: WS-10 - Evidence Folder Convention
```

---

## Current Stage Summary

| Area | Status | Evidence / Artifact |
|---|---|---|
| Stage 1 - App Description | FILED | `modules/ALP/00-app-description/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md` |
| Stage 2 - UX Workflow & Wiring Spec | FILED FOR REVIEW | `modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md` |
| Stage 3 - FRS | FILED FOR REVIEW | `modules/ALP/02-frs/functional-requirements.md` |
| Stage 4 - TRS | FILED FOR REVIEW | `modules/ALP/03-trs/technical-requirements-specification.md` |
| Stage 5 - Architecture | FILED FOR REVIEW | `modules/ALP/04-architecture/architecture.md` |
| Stage 6 - QA-to-Red | FILED | `modules/ALP/05-qa-to-red/qa-to-red.md` |
| Requirement Registry | FILED FOR REVIEW | `modules/ALP/REQUIREMENT_REGISTRY.md` |
| WS-06 QA-ALP Range Status | CONFIRMED MODULE-LOCAL | `modules/ALP/05-qa-to-red/qa-alp-range-status.md` |
| WS-07 Runtime / Deployment Contract | FILED FOR REVIEW | `modules/ALP/11-build/runtime-deployment-contract.md` |
| WS-08 Golden Path Verification Pack | FILED FOR REVIEW IN CURRENT PR | `modules/ALP/11-build/golden-path-verification-pack.md` |
| WS-09 Build Tracker | INITIALIZED IN CURRENT PR | `modules/ALP/BUILD_PROGRESS_TRACKER.md` |
| WS-10 Evidence Folder Convention | NOT STARTED | Pending |
| Stage 9 Builder Checklist | FILED BUT NOT PASS-FINALIZED FOR NAMED BUILDERS | `modules/ALP/08-builder-checklist/builder-checklist.md` |
| Stage 10 IAA Pre-Brief | FILED BUT ACKNOWLEDGEMENTS/ADVISORY STILL BLOCKING | `modules/ALP/09-iaa-pre-brief/iaa-pre-brief.md` |
| Stage 11 Builder Appointment | BLOCKED | `modules/ALP/10-builder-appointment/builder-appointment.md` |
| Stage 12 Build Authorization | BLOCKED | `modules/ALP/11-build/build-authorization.md` |

---

## Module Lifecycle Progress

### Stage 1: App Description
**Status**: [x] FILED  
**Location**: `modules/ALP/00-app-description/`  
**Key Artifacts**:
- [x] `APGI_LEARNING_PORTAL_APP_DESCRIPTION.md`

---

### Stage 2: UX Workflow & Wiring Spec
**Status**: [x] FILED FOR REVIEW  
**Location**: `modules/ALP/01-ux-workflow-wiring/`  
**Key Artifacts**:
- [x] `ux-workflow-wiring-spec.md`
- [x] User journeys `UJ-ALP-001` through `UJ-ALP-020` recorded
- [x] Route/screen/state and workflow wiring captured

---

### Stage 3: Functional Requirements Specification
**Status**: [x] FILED FOR REVIEW  
**Location**: `modules/ALP/02-frs/`  
**Key Artifacts**:
- [x] `functional-requirements.md`
- [x] Functional requirement groups `FR-ALP-*` recorded
- [x] Governance posture preserves build block

---

### Stage 4: Technical Requirements Specification
**Status**: [x] FILED FOR REVIEW  
**Location**: `modules/ALP/03-trs/`  
**Key Artifacts**:
- [x] `technical-requirements-specification.md`
- [x] Technical requirement groups `TR-ALP-*` recorded
- [x] Payment, AIMC, certificate, admin, QA, and deployment groups captured

---

### Stage 5: Architecture
**Status**: [x] FILED FOR REVIEW  
**Location**: `modules/ALP/04-architecture/`  
**Key Artifacts**:
- [x] `architecture.md`
- [x] Architecture principles `ARC-ALP-001` through `ARC-ALP-008` recorded
- [x] Runtime/deployment dependency carried forward to WS-07

---

### Stage 6: QA-to-Red
**Status**: [x] FILED  
**Location**: `modules/ALP/05-qa-to-red/`  
**Key Artifacts**:
- [x] `qa-to-red.md`
- [x] `qa-catalog-alignment.md`
- [x] `red-proof-report.md`
- [x] `qa-alp-range-status.md`

**QA Range**:
```text
QA-ALP-001 through QA-ALP-700
```

**Range Status**: Confirmed module-local by WS-06.

---

### Requirement Registry
**Status**: [x] FILED FOR REVIEW  
**Location**: `modules/ALP/`  
**Key Artifacts**:
- [x] `REQUIREMENT_REGISTRY.md`
- [x] Maps `UJ-ALP-*`, `FR-ALP-*`, `TR-ALP-*`, `ARC-ALP-*`, and `QA-ALP-*`

---

### WS-07: Runtime / Deployment Contract
**Status**: [x] FILED FOR REVIEW  
**Location**: `modules/ALP/11-build/`  
**Key Artifacts**:
- [x] `runtime-deployment-contract.md`

**Contract Coverage**:
- [x] Deployment target posture
- [x] Environment variable and secret naming contract
- [x] Seeded role/user contract
- [x] Storage provider contract
- [x] Payment provider runtime contract
- [x] AIMC Gateway runtime contract
- [x] Certificate generation runtime contract
- [x] Health/readiness checks
- [x] Preview/production CWT URL posture

---

### WS-08: Golden Path Verification Pack
**Status**: [x] FILED FOR REVIEW IN CURRENT PR  
**Location**: `modules/ALP/11-build/`  
**Key Artifacts**:
- [x] `golden-path-verification-pack.md`

**Verification Contract Coverage**:
- [x] Golden paths
- [x] Negative paths
- [x] Required test identities
- [x] Evidence requirements
- [x] Minimum CWT route set
- [x] Pass/fail criteria

---

### WS-09: Build Tracker Initialization / Ongoing Maintenance
**Status**: [x] INITIALIZED IN CURRENT PR  
**Location**: `modules/ALP/`  
**Key Artifacts**:
- [x] `BUILD_PROGRESS_TRACKER.md`

**Maintenance Rule**: This tracker must be updated whenever a workstream/stage status changes, a blocker is cleared, a build-wave status changes, evidence is attached, checks run, PRs merge, or a build authorization posture changes.

#### W0-W9 Build Wave Status Table

This table satisfies WS-09 by recording wave status rows, evidence link columns, merge/check status columns, and blocker/risk columns. All waves remain blocked until WS-10, Stage 9/10/11, and final build authorization gates clear.

| Wave | Planned Scope | Status | Evidence Link(s) | Merge / PR Status | Check Status | Blocker / Risk |
|---|---|---|---|---|---|---|
| W0 | Runtime baseline, repo/app shell, environment contract alignment, health/readiness skeleton | BLOCKED - not authorized | Pending | No PR | No checks run | Build authorization blocked; WS-10 evidence convention missing; no appointed builder |
| W1 | Auth, roles, protected routes, learner/admin/reviewer access boundaries | BLOCKED - not authorized | Pending | No PR | No checks run | Builder appointment blocked; RED-to-GREEN not authorized |
| W2 | Learner enrolment flows: invite, paid enrolment, admin enrolment, payment idempotency | BLOCKED - not authorized | Pending | No PR | No checks run | Payment sandbox/secrets not authorized; build blocked |
| W3 | Dashboard, course shell, module/unit navigation, external URL unit handling | BLOCKED - not authorized | Pending | No PR | No checks run | Build blocked; CWT evidence not yet executable |
| W4 | Progress tracking, assessment unlock, assessment submission, evidence upload | BLOCKED - not authorized | Pending | No PR | No checks run | Storage/evidence convention pending; build blocked |
| W5 | AIMC Gateway evaluation, failure handling, human review queue, reviewer final decision | BLOCKED - not authorized | Pending | No PR | No checks run | AIMC runtime secrets not authorized; build blocked |
| W6 | Certificate eligibility, certificate generation, artifact privacy controls | BLOCKED - not authorized | Pending | No PR | No checks run | Certificate runtime/signing secret not authorized; build blocked |
| W7 | Admin reports, exports, audit views, payment/admin review surfaces | BLOCKED - not authorized | Pending | No PR | No checks run | Admin evidence convention pending; build blocked |
| W8 | Security/privacy hardening, role-denied paths, cross-learner denial, private storage checks | BLOCKED - not authorized | Pending | No PR | No checks run | RLS/security evidence not executable before build authorization |
| W9 | Deployment/CWT evidence, preview URL proof, final wave evidence packaging, handover readiness | BLOCKED - not authorized | Pending | No PR | No checks run | WS-08/WS-10 and final build authorization required; production promotion blocked |

#### Wave Closure Rule

No wave may move from `BLOCKED - not authorized` to `IN PROGRESS`, `READY FOR REVIEW`, or `CLOSED` until all of the following are true:

- WS-10 Evidence Folder Convention is filed and accepted;
- Stage 9 named-builder checklist PASS evidence is complete;
- Stage 10 acknowledgements/advisory evidence is complete;
- Stage 11 builder appointment is complete;
- final Stage 12 build authorization is issued;
- the wave has a PR or evidence record;
- evidence links, merge/check status, and blocker/risk status are updated in this tracker.

---

### WS-10: Evidence Folder Convention
**Status**: [ ] NOT STARTED  
**Expected Location**: `modules/ALP/11-build/evidence/` or other approved canonical evidence path  
**Required Before Build**:
- [ ] Evidence folder convention
- [ ] CWT evidence naming rules
- [ ] Screenshot/video/log/test-output storage rules
- [ ] Secret/private-data exclusion rules

---

### Stage 9: Builder Checklist
**Status**: [ ] BLOCKED / NOT FINALIZED FOR NAMED BUILDERS  
**Location**: `modules/ALP/08-builder-checklist/`  
**Key Artifacts**:
- [x] `builder-checklist.md`
- [x] `builder-checklist-review-resolution.md`

**Remaining Need**:
- [ ] Named builder readiness evidence
- [ ] Explicit PASS state for selected builder(s)

---

### Stage 10: IAA Pre-Brief
**Status**: [ ] BLOCKED / ACKNOWLEDGEMENTS AND ADVISORY STILL PENDING  
**Location**: `modules/ALP/09-iaa-pre-brief/`  
**Key Artifacts**:
- [x] `iaa-pre-brief.md`

**Remaining Need**:
- [ ] Named builder acknowledgement evidence
- [ ] Advisory/assurance recording evidence

---

### Stage 11: Builder Appointment
**Status**: [ ] BLOCKED  
**Location**: `modules/ALP/10-builder-appointment/`  
**Key Artifacts**:
- [x] `builder-appointment.md`

**Reason Blocked**:
- No builder appointment authorized
- Stage 9/10/advisory prerequisites still unresolved

---

### Stage 12: Build Authorization / Build Execution
**Status**: [ ] BLOCKED  
**Location**: `modules/ALP/11-build/`  
**Key Artifacts**:
- [x] `build-authorization.md` - blocked build authorization record
- [x] `build-readiness-remediation-plan.md`
- [x] `carry-forward-artifact-verification.md`
- [x] `runtime-deployment-contract.md`
- [x] `golden-path-verification-pack.md` - current PR

**Stage 12 cannot begin until**:
- [ ] WS-08 is merged and reviewed
- [ ] WS-09 tracker is current and accepted
- [ ] WS-10 evidence convention is filed
- [ ] Stage 9 builder checklist is pass-finalized for named builder(s)
- [ ] Stage 10 acknowledgements/advisory are complete
- [ ] Stage 11 builder appointment is complete
- [ ] Final Stage 12 build authorization is issued

---

## Active Blockers

| Blocker ID | Blocker | Current Status | Required Next Action |
|---|---|---|---|
| ALP-BLOCK-001 | WS-08 Golden Path Verification Pack not merged | In current PR | Review and merge WS-08 artifact |
| ALP-BLOCK-002 | WS-09 tracker not yet accepted on main | In current PR | Review and merge tracker |
| ALP-BLOCK-003 | WS-10 evidence folder convention missing | Open | File evidence convention artifact |
| ALP-BLOCK-004 | Stage 9 named-builder PASS evidence incomplete | Open | Complete builder checklist finalization |
| ALP-BLOCK-005 | Stage 10 acknowledgements/advisory incomplete | Open | Complete IAA/advisory evidence |
| ALP-BLOCK-006 | Stage 11 actual builder appointment incomplete | Open | Appoint builder only after prerequisites clear |
| ALP-BLOCK-007 | Stage 12 final build authorization missing | Open | Issue only after all blockers clear |

---

## Immediate Next Action

```text
Review and merge the WS-08 Golden Path Verification Pack and ALP Build Progress Tracker PR.
```

After this PR merges, the next workstream is:

```text
WS-10 - Evidence Folder Convention
```

The tracker itself is now initialized and must be kept current as each remaining blocker changes.

---

## Build Authorization Posture

```text
Builder Appointment: BLOCKED
Build Authorization: BLOCKED
Implementation: BLOCKED
Functional Pass: NOT CLAIMABLE
Code Pass: NOT CLAIMABLE
CWT Pass: NOT CLAIMABLE
```

No percentage-complete claim is made because ALP has not entered authorized build execution.

---

## Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-16 | Initialized ALP build progress tracker alongside WS-08 Golden Path Verification Pack. | AI-assisted draft (pending Foreman/Governance review) | Filed for review; build remains blocked |
| 0.2 | 2026-06-17 | Added required W0-W9 wave status table with evidence, merge/check status, and blocker/risk columns. | AI-assisted draft (pending Foreman/Governance review) | Filed for review; build remains blocked |
