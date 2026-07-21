# UX Workflow Addendum - W4.2 Enrolment, Catalogue, and W4.3-W4.5 Payment Roadmap

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md` |
| Addendum ID | UX-ALP-W4-2-W4-5-ENROL-20260721 |
| Date | 2026-07-21 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |

## New UX journeys

| Journey ID | Workflow | Primary Actor | Governing slice | Status |
|---|---|---|---|---|
| UJ-ALP-022 | Learner browses a generic multi-course catalogue and sees course-specific enrolment state and action | Learner | W4.2 | Defined |
| UJ-ALP-023 | Administrator invites one or more learners to selected courses and records the access basis and reason | Administrator | W4.2 | Defined |
| UJ-ALP-024 | Invited learner redeems a secure invitation and receives governed course enrolment | Learner | W4.2 | Defined |
| UJ-ALP-025 | Administrator revokes or reinstates course access with reason and audit evidence | Administrator | W4.2 | Defined |
| UJ-ALP-026 | System records an explicit payment lifecycle independently of browser UI state | System/Administrator | W4.3 | Defined for later status-model prebuild/build |
| UJ-ALP-027 | Product owner selects a payment provider and accepts architecture, security, privacy and operational risks | Product owner/Architect | W4.4 | Defined for later decision cycle |
| UJ-ALP-028 | Learner self-enrols through provider checkout and receives access only after authoritative payment confirmation | Learner/System | W4.5 | Defined for later sandbox execution cycle |
| UJ-ALP-029 | Administrator governs complimentary or discounted offer codes | Administrator | W4.5 or later commercial slice | Defined for later separate authorization |
| UJ-ALP-030 | Legacy course route redirects to the current catalogue or corresponding public course page | Learner/External visitor | W4.2 | Defined |

## Generic navigation and catalogue journey

The signed-in learner navigation must use generic labels:

- Dashboard
- My learning
- Course catalogue
- Profile
- Administration, visible only to authorized administrators
- Sign out

The catalogue must display all published courses and the current learner-course relationship:

| State | Required presentation | Required action |
|---|---|---|
| Enrolled | Enrolled and current progress | Continue course |
| Pending | Enrolment pending | No gated content access |
| Not enrolled | Not yet enrolled | View course / Enrol now |
| Revoked | Access revoked | Contact administrator; gated access denied |

## W4.2 administrator invitation journey

1. Administrator opens Administration > Invitations.
2. Administrator selects one or more published courses.
3. Administrator supplies one learner email or an approved batch input.
4. Administrator selects the access basis: external payment, corporate order, complimentary marketing, internal allocation or other.
5. A reason is mandatory; external order/reference and company are optional but auditable.
6. Administrator selects expiry and approved redemption rules.
7. System creates an opaque invitation token, stores only a protected representation, and records issuer, course scope, recipient, reason and expiry.
8. Learner opens the invitation link, signs in or creates an account using the invited email, and redeems the invitation.
9. System creates or updates the course enrolment idempotently and records the enrolment event.
10. Expired, revoked, mismatched-email, reused or invalid invitations must not grant access.

## Complimentary and externally paid access

- Complimentary access requires a mandatory reason and authorized issuer.
- Payment received outside the platform requires a recorded source/reference and administrator confirmation.
- These are W4.2 administrative enrolment bases, not provider-payment execution.
- Every grant, redemption, revocation and reinstatement must be traceable.

## Payment roadmap journeys

### W4.3 payment status model

The system must represent explicit payment states such as pending, paid, failed, cancelled, refunded, disputed and unknown. No checkout or webhook execution is authorized in W4.3.

### W4.4 provider and risk decision

Before payment execution, the product owner must approve the provider, architecture, webhook authentication method, data minimization, reconciliation controls, refund/dispute handling and sandbox exit criteria.

### W4.5 sandbox payment execution

Only after W4.1-W4.4 are accepted may a learner initiate provider checkout. Browser success alone must never grant access. Verified, idempotent provider confirmation may create entitlement in the sandbox-controlled implementation.

Offer-code execution requires separate authorization within W4.5 or a later commercial slice and may not bypass issuer, reason, scope, expiry or redemption controls.

## Legacy route journey

Legacy landing routes must first be inventoried. Each route must either remain supported or issue a tested redirect to the new catalogue/current public course route. Deletion without redirect and external-link impact review is prohibited.

## Proof obligations

W4.2 proof must cover catalogue states, admin-only navigation, invitation creation and redemption, invalid/expired/reused token denial, complimentary reason capture, external-payment reason/reference, revocation/reinstatement, generic sidebar labels and legacy redirects. Payment proof remains governed separately by W4.3, W4.4 and W4.5.
