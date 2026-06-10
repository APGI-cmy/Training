# APGI Learning Portal — QA Catalog Alignment

## Status

| Field | Value |
|---|---|
| Module | ALP — APGI Learning Portal |
| Stage | 6 — QA-to-Red |
| Version | 0.1 |
| Status | Draft — module-local QA range reserved |
| Build Authorized? | No |
| PBFAG Authorized? | No |

## Reserved QA Range

```text
QA-ALP-001 through QA-ALP-700
```

## Range Allocation

| Range | Domain | Test File |
|---|---|---|
| QA-ALP-001 to QA-ALP-020 | Governance and artifact gates | governance-artifacts.spec.ts |
| QA-ALP-021 to QA-ALP-065 | Architecture physical inventory | architecture-inventory.spec.ts |
| QA-ALP-066 to QA-ALP-080 | Auth, roles, route protection | auth.spec.ts |
| QA-ALP-211 to QA-ALP-250 | Course shell and unit viewer | course-shell.spec.ts |
| QA-ALP-291 to QA-ALP-340 | Assessment submission | assessment-submission.spec.ts |
| QA-ALP-416 to QA-ALP-450 | Certificates | certificate.spec.ts |
| QA-ALP-526 to QA-ALP-565 | Security/privacy/RLS | security-privacy.spec.ts |
| QA-ALP-636 to QA-ALP-700 | Deployment and CWT | deployment-cwt.spec.ts |

## Alignment Statement

This QA range is derived from App Description, UX Workflow & Wiring Spec, FRS, TRS, and Architecture v0.2. The range remains module-local until the Foreman/Governance Administrator either registers it in the canonical QA Catalog or formally accepts this module-local QA catalog for ALP.

## Gate

PBFAG remains blocked until executable RED proof is filed.
