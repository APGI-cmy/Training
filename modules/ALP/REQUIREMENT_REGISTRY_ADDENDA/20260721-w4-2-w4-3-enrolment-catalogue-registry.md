# Requirement Registry Addendum - W4.2/W4.3 Enrolment and Course Catalogue

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/REQUIREMENT_REGISTRY.md` |
| Addendum ID | REG-ALP-W4-2-W4-3-ENROL-20260721 |
| Date | 2026-07-21 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |

## Change drivers

- PR #92 merged and deployed the learner sidebar and denied-state loop-breaker.
- Browser proof confirmed dashboard/profile navigation, public/governed route distinction and the not-enrolled denial path.
- Product direction now requires multi-course catalogue behaviour, administrator invitations/manual enrolment, later paid self-enrolment and governed offer codes.
- Existing live schema already includes `user_roles`, `course_enrolments` and `course_enrolment_events`, with existing `admin` role and enrolment sources including `manual`, `admin` and `payment`.

## Traceability mapping

| UX ID | Journey | FR group(s) | Required QA/evidence |
|---|---|---|---|
| UJ-ALP-022 | Generic catalogue with learner-specific course state | FR-ALP-CATALOGUE | Catalogue state matrix, generic sidebar and multi-course proof |
| UJ-ALP-023 | Administrator creates invitation/manual enrolment | FR-ALP-INVITE | Admin authorization, required reason, selected courses, audit event |
| UJ-ALP-024 | Learner redeems invitation | FR-ALP-INVITE | Valid redemption plus invalid, expired, reused and email-mismatch denial |
| UJ-ALP-025 | Administrator revokes/reinstates access | FR-ALP-ACCESS-MGMT | State transition, reason, event trail and route denial/restoration |
| UJ-ALP-026 | Learner pays and self-enrols | FR-ALP-CHECKOUT | Sandbox payment, verified webhook, duplicate delivery and failure paths |
| UJ-ALP-027 | Administrator governs offer codes | FR-ALP-OFFER | Scope, limits, expiry, revocation and redemption proof |
| UJ-ALP-028 | Legacy route redirects safely | FR-ALP-CATALOGUE | Route inventory and redirect QA |

## Source artifacts

- App Description addendum: `modules/ALP/00-app-description/addenda/20260721-w4-2-w4-3-enrolment-catalogue-addendum.md`
- UX addendum: `modules/ALP/01-ux-workflow-wiring/addenda/20260721-w4-2-w4-3-enrolment-catalogue-workflows.md`
- FRS addendum: `modules/ALP/02-frs/addenda/20260721-w4-2-w4-3-enrolment-catalogue-requirements.md`
- QA prebuild: `modules/ALP/03-qa-to-red/20260721-w4-2-w4-3-enrolment-catalogue-qa-plan.md`
- Governance evidence: `modules/ALP/11-build/evidence/20260721-W4-GOV-ALP-094-decision-enrolment-catalogue-prebuild.md`

## Sequencing control

1. Merge this prebuild PR.
2. File executable W4.2 QA-to-Red tests.
3. Only then assign the existing `admin` role to `johan.ras@apginc.ca` and implement the W4.2 admin/invitation/catalogue slice.
4. Build to green and capture browser/database proof.
5. Test enrolled, pending and revoked states with controlled data and cleanup.
6. Open a separate W4.3 sandbox prebuild/build cycle for payment and offer-code implementation.

## Non-claims

This registry addendum does not authorize live role assignment, database migration, invitation dispatch, payment integration, payment readiness, W4 closure, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS, deployment acceptance or production readiness.