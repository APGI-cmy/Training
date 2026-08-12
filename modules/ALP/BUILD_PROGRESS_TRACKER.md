# BUILD PROGRESS TRACKER

**Module**: ALP (APGI Learning Portal)  
**Module Slug**: ALP  
**Last Updated**: 2026-08-11
**Updated By**: Production release reconciliation and Learner Management Experience authority
> **Classification**: ACTIVE — BATCH 3 STABILISATION RELEASED; W4.2 LEARNER MANAGEMENT EXPERIENCE AUTHORISED
> **Repository**: APGI-cmy/Training  
> **Current Workstream**: W4.2 Learner Management Experience (LMX): safe admin learner directory, staged invitation/import UX and administrator full-page course preview
> **Next Required Action**: Build, test and independently review the LMX release candidate. No invitation, enrolment, email, payment or bulk-import write is authorised in this slice.

---

## Current Executive Status

| Item | Status | Evidence |
|---|---|---|
| W0 Foundation / Scaffold | Closed for scaffold scope | PR #71-#72 |
| W1 Auth / Profile / Files | Closed for approved W1 scope | PR #73-#77 |
| W2 Dashboard / Course Shell / Unit Viewer | Closed for approved W2 scope | PR #78-#79 |
| W3 Progress + Completion | Closed for approved database-backed scope | PR #80-#84 |
| W4 Enrolment + Payments | Active; not closed | PR #85 entry; W4.1 PR #86-#92; W4.2 PR #93-#101 |
| W4.1 Access gating | Database proof accepted; browser acceptance reopened by Batch 3 course-flow findings | PR #88, #92; 2026-07-28 browser evidence |
| W4.2 Manual/admin enrolment | Migration and live lifecycle proof substantially passed; functional acceptance reopened for portal/course-flow stabilisation | PR #93-#101; live Supabase Batch 1-3 evidence |
| W4.3 Payment status model | Roadmap requirements only; not started | Payment sequence preserved |
| W4.4 Provider decision | Not started | Required before payment execution |
| W4.5 Payment execution | Not authorised | Blocked |
| Batch 3 Lane A | Released stabilisation scope; production Git deployment smoke-tested | PR #102 merged at `312e551`; 2026-08 production reconciliation |
| Invitation delivery preflight | CS2 authorised as separate no-send lane | No provider, secret or send implementation authorised |
| W4.2 Learner Management Experience | Local build candidate complete; scoped QA GREEN; preview evidence pending | 2026-08-11 LMX authority stack and build evidence |

### Production release reconciliation — PR #102

PR #102 was merged to `main` at `312e551` and its successful Git-integrated production deployment was smoke-tested. The authenticated proof covers administrator sign-in, VPSHR and Scannex playback, learner sign-in/navigation and learner-side absence of administration destinations. A separate duplicate command-line deployment failed because it did not materialise Git LFS media; it was not aliased to production and did not replace the successful Git deployment.

Batch 3 Lane A is therefore **released for its stabilisation scope**. Its former rebase-candidate, pending-preview and pending-IAA wording is historical only. W4 and platform-wide closure are still not claimed.

### W4.2 Learner Management Experience (LMX) — authorised 2026-08-11

The product owner has authorised a Thinkific-inspired admin learner-management experience as the next bounded W4.2 improvement:

- searchable, paginated, read-only learner directory with course relationship/status information;
- a clear, validated single-learner invitation workspace that remains in **draft/preview** mode;
- enrolment management selected from a learner record rather than by manually entering an opaque user ID;
- a staged bulk-import workspace with CSV template, local parsing and validation only; and
- a full-page administrator course-preview route with no learner progress or enrolment mutation.

This is not authority to create learners, send email, create invitations, alter enrolments, upload source rows to the server, configure an email provider, perform payment work or make production writes. These continue to require a separately agreed test learner and lifecycle.

---

## Accepted Historical Posture

### W3

- Learner progress UI, database-backed progress and completion proof accepted for approved W3 scope.
- `ALP-CTRL-011` closed by PR #83.

### W4 entry and payment boundary

- W4 entry merged by PR #85.
- Sequence remains W4.1 access gating, W4.2 manual/admin enrolment, W4.3 payment status, W4.4 provider decision, W4.5 payment execution.
- Payment execution, checkout, provider webhooks and offer-code execution remain outside current authority.

### W4.1

- `course_enrolments` and `course_enrolment_events` exist and are database-backed.
- Pending, enrolled and revoked states are implemented.
- Course and unit routes fail closed.
- Navigation/sidebar loop repair merged by PR #92.
- Final W4.1 closure remains unclaimed.

### W4.2 prebuild and build history

| Item | Evidence |
|---|---|
| Original W4.2 prebuild | PR #93 |
| Original executable QA-to-Red | PR #94 |
| Original implementation build-to-Green | PR #98 |
| Post-merge normalization | PR #99 |
| Migration-security correction | PR #100 |
| First Batch 3 browser repair | PR #101 |

Migration `010_alp_admin_invitations` was applied live after PR #100. The exact administrator role for `johan.ras@apginc.ca` was added. Controlled live proof covered pending, redeemed, enrolled, revoked, reinstated, reused, expired, wrong-email, wrong-course and invalid-token paths. Direct invitation-table access and anonymous RPC execution were denied as designed.

---

## Batch 3 Browser Failure and Recovery Record

### Deviation ID

`DEV-ALP-B3-20260728-PORTAL-COURSE-FLOW`

### Trigger

Post-PR #101 browser proof confirmed that role-aware sign-in and Scannex single-encoding were repaired, but exposed broader functional and UX failures that prevented full W4.2 functional acceptance.

### Observed failures

1. Deployment root and APGI Training brand route to the VPSHR public page instead of the role-aware portal entry.
2. Administrator pages use an incomplete parallel navigation shell; Invitations and Access management are not integrated into the persistent sidebar.
3. Dashboard lists all published courses and counts inaccessible units instead of showing enrolled learning only.
4. My Learning, Catalogue and Dashboard responsibilities are blurred.
5. VPSHR public pages expose gated-unit actions that lead not-enrolled or pending users into avoidable denial loops.
6. Course-access recovery is hard-coded to the VPSHR public route.
7. Scannex public pages expose raw published unit links outside the governed course shell.
8. VPSHR and Scannex use inconsistent course-overview patterns.
9. Enrolled Scannex content loads, but VPSHR governed unit launch does not yet produce equivalent end-to-end content access.
10. Invitation creation does not send email; it creates a one-time token/path only. No `sent` claim is valid without a provider operation and audit event.

### Disposition

- W4.2 code/build history remains valid but **FUNCTIONAL_PASS remains open**.
- Batch 4 cleanup is blocked; controlled evidence tagged `ALP-BATCH3-20260727` must be retained.
- CS2 authorised a bounded Batch 3 stabilisation wave on 2026-07-28.
- Lane A covers portal entry, navigation, dashboard/My Learning projections, shared course presentation, governed launch, generic links, admin preview and executable regressions.
- Invitation delivery is a separate preflight lane and may not add a provider, credentials or send implementation.

---

## Batch 3 Stabilisation Authority Stack

| Stage | Artifact | Status |
|---|---|---|
| App Description | `modules/ALP/00-app-description/addenda/20260728-batch3-stabilisation-addendum.md` | Filed on Lane A branch |
| UX Workflow | `modules/ALP/01-ux-workflow-wiring/addenda/20260728-batch3-stabilisation-workflows.md` | Filed on Lane A branch |
| FRS | `modules/ALP/02-frs/addenda/20260728-batch3-stabilisation-requirements.md` | Filed on Lane A branch |
| TRS | `modules/ALP/03-trs/addenda/20260728-batch3-stabilisation-technical-requirements.md` | Filed on Lane A branch |
| Architecture | `modules/ALP/04-architecture/addenda/20260728-batch3-stabilisation-architecture.md` | Filed on Lane A branch |
| Requirement Registry | `modules/ALP/REQUIREMENT_REGISTRY_ADDENDA/20260728-batch3-stabilisation-registry.md` | Filed on Lane A branch |
| QA-to-Red Plan | `modules/ALP/05-qa-to-red/addenda/20260728-batch3-stabilisation-qa-plan.md` | Filed on Lane A branch |
| Implementation Plan | `modules/ALP/07-implementation-plan/addenda/20260728-batch3-stabilisation-implementation-plan.md` | Filed on Lane A branch |
| Builder Checklist | `modules/ALP/08-builder-checklist/addenda/20260728-batch3-stabilisation-builder-checklist.md` | Filed on Lane A branch |
| PBFAG | `modules/ALP/06-pbfag/addenda/20260728-batch3-stabilisation-pbfag.md` | PASS at exact-head run `30342160476` |
| Wave Checklist | `.agent-admin/waves/wave-batch3-lane-a-current-tasks.md` | Stage 11 complete; `BC-ALP-B3-LA-001` appointed |
| IAA Pre-Brief Invocation | `modules/ALP/09-iaa-pre-brief/addenda/20260728-batch3-stabilisation-iaa-invocation.md` | Completed by independent IAA session |
| Active IAA Pre-Brief | `.agent-admin/assurance/iaa-prebrief-batch3-lane-a.md` | ACTIVE — session `IAA-20260728-PREBRIEF-BATCH3-LANE-A` |
| Stage 10 acknowledgements | `modules/ALP/09-iaa-pre-brief/addenda/20260728-batch3-stabilisation-iaa-acknowledgements.md` | Foreman and `BC-ALP-B3-LA-001` COMPLETE before Stage 11 appointment |
| Stage 11 appointment | `modules/ALP/10-builder-appointment/addenda/20260728-batch3-lane-a-builder-appointment.md` | `APPT-ALP-B3-LA-001`; `BC-ALP-B3-LA-001` appointed for frozen Lane A only |
| Executable RED | `tests/qa-to-red/alp/batch3-stabilisation-red.spec.ts` | Exact-head correct RED accepted at commit `3d9cc74f83c64e46a9134977e57fec5115691e54` |

### QA/governance correction

Run `30336426460` at head `54d61067ff34da0fc6a98a1da0a2c7e66c4a8c72` produced typecheck PASS, 26 established W4.2 tests PASS and 10 Batch 3 failures. Eight failures were controlled assertions; two were invalid `ENOENT` file reads. CS2 authorised a bounded PR #102 QA/governance correction on 2026-07-28.

The correction converts both missing-file failures into explicit missing-capability assertions and hardens the exact-head workflow to accept only:

- typecheck PASS;
- 26/26 established W4.2 tests PASS;
- 10/10 Batch 3 tests FAIL for the declared missing capabilities;
- zero Batch 3 pass/skip/todo; and
- no file-read, syntax, runner, transform or module-resolution failure.

Exact-head workflow run `30342160476` at commit `3d9cc74f83c64e46a9134977e57fec5115691e54` satisfies that contract: typecheck PASS, 26/26 established W4.2 tests PASS, 15/15 W1/W4.1 tests PASS, 10/10 controlled Batch 3 failures and evidence upload PASS. No Lane A product implementation or builder appointment is authorised by this correction.

---

## Lane A Gate Sequence

1. Commit the complete authority stack and this tracker deviation record.
2. Commit executable tests derived from QA-ALP-B3-001..020.
3. Prove the suite fails correctly against PR #101 merge commit `a056b51d9353426d5ba96154d190ca71ac44f008`.
4. Publish the independent IAA Pre-Brief and record Foreman and designated-candidate acknowledgements.
5. Complete Stage 10, then separately complete the builder checklist and formal Stage 11 appointment.
6. Implement only the authorised Lane A scope after appointment.
7. Build the frozen tests to Green without weakening assertions.
8. Run existing W1, W4.1 and W4.2 suites, typecheck and production build.
9. Verify exact-head GitHub and Vercel deployments.
10. Perform browser retest using preserved controlled learner state.
11. Start cleanup only after browser proof is accepted.

---

## Active Controls

| Control ID | Control | Status | Required next action |
|---|---|---|---|
| ALP-CTRL-003 | Full app workflows not complete | Open | Complete remaining governed waves. |
| ALP-CTRL-004 | CODE_PASS not claimed | Open | Review exact-head code/build evidence. |
| ALP-CTRL-005 | FUNCTIONAL_PASS not claimed | Partially satisfied | Batch 3 browser proof passed; retain broader W4 functional-proof boundary. |
| ALP-CTRL-006 | CWT_PASS not claimed | Open | Complete later deployment/CWT wave. |
| ALP-CTRL-010 | Legacy iSpring media inconsistency | Open | Carry to content hardening unless encountered in Lane A. |
| ALP-CTRL-011 | Live Supabase progress tables | Closed | Reopen only on regression. |
| ALP-CTRL-012 | Portal/course-flow stabilisation | Rebase gate | Complete exact-head CI and fresh preview smoke, then final IAA. |
| ALP-CTRL-013 | Invitation delivery not implemented | Open | Complete separate provider preflight; no send claim before authorised build. |

---

## Build Authorization Posture

W1 Closure: CLOSED FOR APPROVED W1 SCOPE  
W2 Closure: CLOSED FOR APPROVED W2 SCOPE  
W3 Closure: CLOSED FOR APPROVED W3 SCOPE  
W4 Entry: MERGED  
W4.1 Final Closure: NOT CLAIMED  
W4.2 Functional Acceptance: REOPENED FOR BATCH 3 STABILISATION  
Batch 3 Lane A Prebuild: CS2 AUTHORISED; FILED ON BRANCH  
Batch 3 Lane A QA-to-Red: EXACT-HEAD CORRECT RED ACCEPTED — RUN `30342160476`

Batch 3 Lane A PBFAG: PASS

Batch 3 Lane A IAA Pre-Brief: ACTIVE — `IAA-20260728-PREBRIEF-BATCH3-LANE-A`; ACKNOWLEDGEMENTS COMPLETE; STAGE 10 PASS

Batch 3 Lane A Builder Candidate: `BC-ALP-B3-LA-001` DESIGNATED AND ACKNOWLEDGED
Batch 3 Lane A Builder Appointment: COMPLETE — `APPT-ALP-B3-LA-001`
Batch 3 Lane A Implementation: CODE / BUILD GREEN AT `15422413d1ccf7d36c9069ca24e07fa22604516c`
Batch 3 Lane A Final Assurance: RELEASED FOR STABILISATION SCOPE — PR #102 was merged and the successful Git-integrated production deployment was smoke-tested; no wider W4 closure is implied
Invitation Delivery Preflight: AUTHORISED AS SEPARATE NO-SEND LANE  
W4.3-W4.5: NOT STARTED / PAYMENT EXECUTION NOT AUTHORISED  
W4 Closure: NOT CLAIMED  
CODE_PASS: NOT CLAIMED  
FUNCTIONAL_PASS: NOT CLAIMED  
CWT_PASS: NOT CLAIMED  
Deployment Acceptance: NOT CLAIMED  
Production Readiness: NOT CLAIMED

---


## W4.2 learner-management extension — 2026-08-12

The post-preview correction extends the existing read/draft-only W4.2 scope. It adds browser-local `.xlsx` alongside CSV staging, requires `email`, `company` and `country` for a review draft, recognises optional `national_identity_number`, `operation_subdivision` and `department_team` (with national identity numbers browser-local, masked in the manual draft and excluded from summaries, URLs, logs and persistence), and adds a separately admin-gated VPSHR presentation-only preview. It does **not** authorise import execution, account matching, invitation creation, enrolment mutation, email delivery, learner-progress writes, or production deployment.

Exact-head GitHub and Vercel evidence is required before a new authenticated no-write smoke and any revised merge disposition.

## Change History

| Version | Date | Change | Authority |
|---|---|---|---|
| 6.6 | 2026-08-05 | Rebased PR #102 onto `main` after PR #103; applied the non-breaking Next/PostCSS remediation; recorded a clean production dependency audit and release-candidate local gates. | CS2-authorised final gate continuation |
| 6.7 | 2026-08-11 | Reconciled PR #102 merged/production-smoke posture and filed the W4.2 Learner Management Experience authority stack. | Product-owner authorised safe UI scope |
| 6.5 | 2026-07-28 | Built Batch 3 Lane A to code/build GREEN, recorded exact-head CI/Vercel evidence, and recorded final IAA NO-GO pending browser proof and dependency-audit disposition. | CS2-authorised build-to-Green |
| 6.4 | 2026-07-28 | Completed Stage 11 and appointed `BC-ALP-B3-LA-001` under `APPT-ALP-B3-LA-001` for the frozen Batch 3 Lane A build-to-Green scope only. | CS2-authorised Stage 11 appointment |
| 6.3 | 2026-07-28 | Activated independent IAA Pre-Brief `IAA-20260728-PREBRIEF-BATCH3-LANE-A`; recorded Foreman and `BC-ALP-B3-LA-001` acknowledgements; passed Stage 10 while preserving separate appointment and implementation blocks. | CS2-authorised Stage 10 activation |
| 6.2 | 2026-07-28 | Accepted exact-head correct RED from commit `3d9cc74f83c64e46a9134977e57fec5115691e54` / run `30342160476`; recorded PBFAG PASS; preserved Stage 10, appointment and implementation blocks. | CS2-authorised bounded correction |
| 6.1 | 2026-07-28 | Recorded CS2-authorised PR #102 QA/governance correction, malformed RED run, local clean-RED preflight, PBFAG disposition, wave checklist and independent-IAA unavailability. | CS2 Johan Ras |
| 6.0 | 2026-07-28 | Recorded PR #100-#101 outcomes, live Batch 1-3 proof, browser failure deviation, full stabilisation authority stack, QA-to-Red requirement and separate invitation-delivery preflight. | CS2 Johan Ras |
| 5.2 | 2026-07-23 | Normalized PR #98 merged posture and moved to controlled live proof. | PR #99 |
| 5.1 | 2026-07-23 | Filed W4.2 build-to-Green implementation while preserving proof boundaries. | PR #98 |
| 5.0 | 2026-07-22 | Normalized executable W4.2 RED posture. | PR #95 |
| 4.9 | 2026-07-22 | Filed executable QA-ALP-252..267. | PR #94 |
| 4.8 | 2026-07-21 | Filed W4.2 enrolment/catalogue prebuild. | PR #93 |
| 4.7 | 2026-07-15 | Filed W4.1 persistent sidebar and loop-breaker build. | PR #92 |
| 4.0-4.6 | 2026-07-02..13 | W4 entry, access gating, DB proof and navigation preparation. | PR #85-#91 |
| 3.0-3.4 | 2026-06-30..07-02 | W3 progress/completion delivery and closure. | PR #80-#84 |
| 1.0-2.1 | 2026-06-26..29 | W0-W2 foundation, auth/profile, dashboard, shell and unit viewer. | PR #71-#79 |
