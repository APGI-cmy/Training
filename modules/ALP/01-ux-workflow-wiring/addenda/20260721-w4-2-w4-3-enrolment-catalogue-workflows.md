# UX Workflow Addendum - W4.2/W4.3 Enrolment and Course Catalogue

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md` |
| Addendum ID | UX-ALP-W4-2-W4-3-ENROL-20260721 |
| Date | 2026-07-21 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |

## New UX journeys

| Journey ID | Workflow | Primary Actor | CWT Required | Status |
|---|---|---|---|---|
| UJ-ALP-022 | Learner browses a generic multi-course catalogue and sees course-specific enrolment state and action | Learner | Yes | Defined |
| UJ-ALP-023 | Administrator invites one or more learners to selected courses and records the access basis and reason | Administrator | Yes | Defined |
| UJ-ALP-024 | Invited learner redeems a secure invitation and receives the governed course enrolment | Learner | Yes | Defined |
| UJ-ALP-025 | Administrator revokes or reinstates course access with reason and audit evidence | Administrator | Yes | Defined |
| UJ-ALP-026 | Learner self-enrols through checkout and receives access only after authoritative payment confirmation | Learner | Yes | Defined for later W4.3 implementation |
| UJ-ALP-027 | Administrator creates and governs complimentary or discounted access codes | Administrator | Yes | Defined for later W4.3 implementation |
| UJ-ALP-028 | Legacy course route redirects to the current catalogue or corresponding public course page | Learner/External visitor | Yes | Defined |

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

## Administrator invitation journey

1. Administrator opens Administration > Invitations.
2. Administrator selects one or more published courses.
3. Administrator supplies one learner email or an approved batch input.
4. Administrator selects the access basis: external payment, corporate order, complimentary marketing, internal allocation, or other.
5. A reason is mandatory; external order/reference and company are optional but auditable.
6. Administrator selects expiry and whether the invitation may be redeemed once or according to approved batch rules.
7. System creates an opaque invitation token, stores only the governed token representation, and records issuer, course scope, recipient, reason and expiry.
8. Learner receives and opens the invitation link, signs in or creates an account using the invited email, and redeems the invitation.
9. System creates or updates the course enrolment and records the corresponding enrolment event.
10. Expired, revoked, mismatched-email, reused or invalid invitations must not grant access.

## Complimentary and externally paid access

- Complimentary access requires a mandatory reason and authorized issuer.
- Payment received outside the platform requires a recorded source/reference and administrator confirmation.
- A 100% offer code is a governed commercial instrument, not an unlogged bypass.
- Every grant, redemption, revocation and reinstatement must be traceable.

## Public self-enrolment journey

1. Learner selects Enrol now for a not-enrolled course.
2. System displays price and eligible offer-code entry.
3. Checkout is initiated with an approved payment provider.
4. Browser success alone does not grant access.
5. Verified, idempotent provider webhook or equivalent authoritative settlement confirmation creates the enrolment.
6. Failed, cancelled, disputed or unverifiable payment does not expose gated content.
7. Reconciliation and exception handling must be available to authorized administrators.

## Legacy route journey

Legacy landing routes must first be inventoried. Each route must either remain supported or issue a tested redirect to the new catalogue/current public course route. Deletion without redirect and external-link impact review is prohibited.

## Browser proof obligations

Implementation proof must cover catalogue states, admin-only navigation, invitation creation and redemption, invalid/expired/reused token denial, complimentary reason capture, external-payment reason/reference, revocation and reinstatement, generic sidebar labels, legacy redirects, and later payment/offer-code success and failure paths.