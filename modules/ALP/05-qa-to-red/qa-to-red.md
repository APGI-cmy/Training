# APGI Learning Portal — Stage 6 QA-to-Red Specification

## Status

| Field | Value |
|---|---|
| Module | ALP — APGI Learning Portal |
| Stage | 6 — QA-to-Red |
| Version | 0.1 |
| Status | Draft — executable RED tests added; RED proof still required |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/05-qa-to-red/qa-to-red.md |
| Build Authorized? | No |
| PBFAG Authorized? | No |

## Purpose

This artifact defines the authoritative RED QA baseline for ALP. It is derived from the Stage 1–5 chain:

```text
App Description → UX Workflow & Wiring Spec → FRS → TRS → Architecture v0.2 → QA-to-Red
```

The tests are intended to fail before implementation because the required LMS routes, components, server actions, migrations, RLS policies, integrations, evidence files, and CWT proof do not yet exist.

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
```

## QA Domains

| Domain | Coverage |
|---|---|
| Governance artifacts | App Description, UX, FRS, TRS, Architecture, QA-to-Red, registry |
| Architecture inventory | Routes, components, server actions, migrations, env vars |
| Auth/security | protected routes, server-side auth, no secret leaks |
| Course shell | learner dashboard/course shell/unit viewer/progress hooks |
| Assessment | submissions, evidence files, AI gateway, review state |
| Certificates | eligibility, generation, download, audit |
| RLS/privacy | table RLS, cross-learner denial, private files |
| Deployment/CWT | build/typecheck/test scripts, evidence, CWT closure |

## RED Validity Rule

Valid RED means tests execute and fail because implementation artifacts are missing or incomplete. Invalid RED includes broken test runner setup, TypeScript syntax errors, skipped tests, or fake placeholder assertions.

## Stage Gate

Stage 6 is not complete until:

- executable tests exist;
- `npm run test:alp:red` executes;
- failures are confirmed correct RED;
- `red-proof-report.md` is completed;
- QA Catalog alignment is accepted;
- no implementation has started;
- build remains blocked.

## Next Artifact

```text
modules/ALP/05-qa-to-red/red-proof-report.md
```
