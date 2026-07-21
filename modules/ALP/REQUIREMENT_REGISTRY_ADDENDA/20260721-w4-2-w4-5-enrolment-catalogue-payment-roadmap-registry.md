# Requirement Registry Addendum - W4.2 Enrolment, Catalogue, and W4.3-W4.5 Payment Roadmap

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/REQUIREMENT_REGISTRY.md` |
| Addendum ID | REG-ALP-W4-2-W4-5-ENROL-20260721 |
| Date | 2026-07-21 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |

## Change drivers

- PR #92 merged and deployed the learner sidebar and denied-state loop-breaker.
- Browser proof accepted dashboard/profile navigation, public/governed distinction, not-enrolled denial and recovery.
- Product direction requires multi-course catalogue behaviour and W4.2 administrator invitations/manual enrolment.
- GOV-ALP-085 remains authoritative for payment sequencing: W4.3 status model, W4.4 provider/risk decision, W4.5 execution.

## Traceability mapping

| UX ID | Journey | FR group(s) | QA/evidence direction |
|---|---|---|---|
| UJ-ALP-022 | Generic catalogue with learner-specific course state | FR-ALP-CATALOGUE | QA-ALP-252 to 256; catalogue/sidebar/redirect proof |
| UJ-ALP-023 | Administrator creates invitation/manual enrolment | FR-ALP-INVITE | QA-ALP-257 to 263; authorization, reason, token and audit proof |
| UJ-ALP-024 | Learner redeems invitation | FR-ALP-INVITE | Valid redemption and negative-path proof |
| UJ-ALP-025 | Administrator revokes/reinstates access | FR-ALP-ACCESS-MGMT | QA-ALP-264 to 267; transition and route proof |
| UJ-ALP-026 | Explicit payment lifecycle is stored independently of UI | FR-ALP-PAYMENT-STATUS | QA-ALP-268 to 272 reserved for later W4.3 cycle |
| UJ-ALP-027 | Provider and payment risks are selected and accepted | FR-ALP-PAYMENT-DECISION | QA-ALP-273 reserved for W4.4 decision evidence |
| UJ-ALP-028 | Learner self-enrols through approved provider | FR-ALP-CHECKOUT | QA-ALP-274 to 276 reserved for later W4.5 sandbox cycle |
| UJ-ALP-029 | Administrator governs offer codes | FR-ALP-OFFER | Separate W4.5/later commercial authorization required |
| UJ-ALP-030 | Legacy route redirects safely | FR-ALP-CATALOGUE | QA-ALP-256 route inventory and redirect proof |

## Source artifacts

- App Description: `modules/ALP/00-app-description/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-addendum.md`
- UX: `modules/ALP/01-ux-workflow-wiring/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-workflows.md`
- FRS: `modules/ALP/02-frs/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-requirements.md`
- Canonical Stage 6 QA expansion: `modules/ALP/05-qa-to-red/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-qa-plan.md`
- Governance evidence: `modules/ALP/11-build/evidence/20260721-W4-GOV-ALP-094-decision-enrolment-catalogue-prebuild.md`

## Sequencing control

1. Merge this prebuild PR.
2. File and prove executable W4.2 QA-ALP-252 through QA-ALP-267 RED tests.
3. Only then implement W4.2 catalogue, admin authorization, invitation/manual enrolment and access management.
4. Assign the existing `admin` role to `johan.ras@apginc.ca` only during the controlled W4.2 implementation/proof cycle.
5. Build W4.2 to green and capture controlled evidence and cleanup.
6. Open separate later cycles for W4.3 payment status, W4.4 provider/risk decision and W4.5 sandbox execution.

## Non-claims

This registry addendum does not authorize live role assignment, database migration, invitation dispatch, provider integration, offer-code execution, payment readiness, W4 closure, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS, deployment acceptance or production readiness.
