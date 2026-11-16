# GOV-ALP-102 — Batch 3 Lane A Correct-RED Decision

## Status

| Field | Value |
|---|---|
| Module | ALP — APGI Learning Portal |
| Wave | W4.2 Batch 3 Lane A stabilisation |
| Evidence type | QA/governance correction and exact-head correct-RED decision |
| Date | 2026-07-28 |
| PR | #102 |
| Commit | `3d9cc74f83c64e46a9134977e57fec5115691e54` |
| Workflow run | `30342160476` |
| Job | `prove-correct-red` / `90219973974` |
| Decision | Correct RED accepted; PBFAG PASS; Stage 10 blocked |

## Correction authority

CS2 Johan Ras authorised the bounded PR #102 QA/governance correction after run `30336426460` showed eight intended assertion failures and two invalid `ENOENT` file-read failures. The authority excluded product implementation and builder appointment.

## Corrected QA behaviour

Both absent capability files now fail through explicit assertions:

- `app/alp-sign-in/actions.ts`; and
- `app/admin/courses/[courseSlug]/preview/page.tsx`.

The workflow rejects unexpected pass, skip/todo, `ENOENT`, runner, syntax, transform and module-resolution failure markers.

## Exact-head proof

| Proof item | Result |
|---|---|
| Dependency installation | PASS |
| TypeScript typecheck | PASS |
| Established W4.2 suites | 26/26 PASS |
| W1/W4.1 regression suites | 15/15 PASS |
| Batch 3 suite | 10/10 controlled FAIL |
| Batch 3 pass/skip/todo | Zero |
| Harness/file-read defects | Zero |
| Evidence upload | PASS |
| Job conclusion | SUCCESS |

The ten failures correspond to the frozen missing capabilities: role-aware entry, administrator sidebar, enrolled dashboard, distinct My Learning projection, shared course overview, removal of raw unit links, course-specific recovery, non-mutating administrator preview, shared safe asset encoding and honest invitation delivery status.

## Governance decision

```text
Correct RED: ACCEPTED.
PBFAG: PASS.
Independent IAA Pre-Brief: NOT COMPLETED.
Builder appointment: BLOCKED.
Implementation: BLOCKED.
```

The Foreman invocation package records `PHASE_A_ADVISORY` because an independent IAA tool/agent was unavailable in the execution environment. That record does not substitute for the independent IAA-generated Pre-Brief.

## Non-claims

This decision does not claim or perform product implementation, live data mutation, email-provider selection or sending, credential or DNS work, payment work, cleanup, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS, deployment acceptance, W4 closure or production readiness.
