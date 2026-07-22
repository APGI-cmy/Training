# APGI Learning Portal — Stage 6 QA-to-Red Specification

## Status

| Field | Value |
|---|---|
| Module | ALP — APGI Learning Portal |
| Stage | 6 — QA-to-Red |
| Version | 0.3 |
| Status | W4.2 executable RED filed; branch proof required before build authorization |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/05-qa-to-red/qa-to-red.md |
| Build Authorized? | No new W4.2 build until executable expansion RED is reviewed, accepted and merged |
| PBFAG Authorized? | No |

## Purpose

This artifact defines the authoritative RED QA baseline for ALP. It is derived from the Stage 1–5 chain:

```text
App Description → UX Workflow & Wiring Spec → FRS → TRS → Architecture v0.2 → QA-to-Red
```

The tests are intended to fail before implementation because required routes, components, server actions, migrations, RLS policies, integrations, evidence files and CWT proof do not yet exist.

## Required RED Test Files

```text
tests/qa-to-red/alp/governance-artifacts.spec.ts
tests/qa-to-red/alp/architecture-inventory.spec.ts
tests/qa-to-red/alp/auth.spec.ts
tests/qa-to-red/alp/course-shell.spec.ts
tests/qa-to-red/alp/assessment-submission.spec.ts
tests/qa-to-red/alp/certificate.spec.ts
tests/qa-to-red/alp/security-privacy.spec.ts
tests/qa-to-red/alp/deployment-cwt.spec.ts
tests/qa-to-red/alp/w4-2-enrolment-catalogue-red.spec.ts
```

## QA Domains

| Domain | Coverage |
|---|---|
| Governance artifacts | App Description, UX, FRS, TRS, Architecture, QA-to-Red, registry |
| Architecture inventory | Routes, components, server actions, migrations, env vars |
| Auth/security | Protected routes, server-side auth, no secret leaks |
| Course shell | Learner dashboard/course shell/unit viewer/progress hooks |
| Assessment | Submissions, evidence files, AI gateway, review state |
| Certificates | Eligibility, generation, download, audit |
| RLS/privacy | Table RLS, cross-learner denial, private files |
| Deployment/CWT | Build/typecheck/test scripts, evidence, CWT closure |
| W4.2 enrolment and catalogue | Generic navigation/catalogue, admin authorization, invitations, protected tokens, audit, revoke/reinstate and pending denial |

## W4 Expansion QA Specification

The discoverable Stage 6 expansion plan is:

`modules/ALP/05-qa-to-red/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-qa-plan.md`

It defines:

- QA-ALP-252 through QA-ALP-267 for the W4.2 catalogue, administrator-invitation and access-management RED suite;
- QA-ALP-268 through QA-ALP-272 as reserved for a later W4.3 payment-status-model cycle;
- QA-ALP-273 as reserved for the W4.4 provider/security/risk decision gate; and
- QA-ALP-274 through QA-ALP-276 as reserved for W4.5 sandbox payment and offer-control execution after W4.1-W4.4 acceptance.

The W4.2 executable suite is filed at `tests/qa-to-red/alp/w4-2-enrolment-catalogue-red.spec.ts`. The dedicated command is `npm run test:alp:w4-2:red`. The proof workflow is `.github/workflows/alp-w4-2-red-proof.yml`.

Payment execution remains blocked.

## RED Validity Rule

Valid RED means tests execute and fail because implementation artifacts are missing or incomplete. Invalid RED includes broken test runner setup, TypeScript syntax errors, skipped tests or fake placeholder assertions.

## Stage Gate

Stage 6 W4.2 expansion is not complete until:

- QA-ALP-252 through QA-ALP-267 exist as executable tests;
- `npm run test:alp:w4-2:red` executes;
- all sixteen tests are present and failures are confirmed correct RED;
- GOV-ALP-095 records the proof result;
- no W4.2 implementation has started before RED acceptance; and
- the build remains blocked until this RED PR is reviewed and merged.

## Next Artifact

```text
modules/ALP/11-build/evidence/20260722-W4-GOV-ALP-095-decision-w4-2-executable-red.md
```
