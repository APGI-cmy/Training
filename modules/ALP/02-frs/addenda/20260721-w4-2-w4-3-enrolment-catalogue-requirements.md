# FRS Addendum - W4.2/W4.3 Enrolment and Course Catalogue

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/02-frs/functional-requirements.md` |
| Addendum ID | FRS-ALP-W4-2-W4-3-ENROL-20260721 |
| Date | 2026-07-21 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |

## Functional requirement groups

| Group ID | Area | UX source |
|---|---|---|
| FR-ALP-CATALOGUE | Generic multi-course catalogue and learner navigation | UJ-ALP-022, UJ-ALP-028 |
| FR-ALP-INVITE | Administrator invitations and manual enrolment | UJ-ALP-023, UJ-ALP-024 |
| FR-ALP-ACCESS-MGMT | Revocation, reinstatement and audit trail | UJ-ALP-025 |
| FR-ALP-CHECKOUT | Public self-enrolment and payment authority | UJ-ALP-026 |
| FR-ALP-OFFER | Complimentary and discount/access codes | UJ-ALP-027 |

## Catalogue and navigation requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-CATALOGUE-001 | The system shall support multiple published courses without hard-coded VPSHR Level 0 navigation. | Generic navigation uses Dashboard, My learning, Course catalogue, Profile, Administration when authorized, and Sign out. |
| FR-ALP-CATALOGUE-002 | The catalogue shall list every published course available to the current audience. | Course source is generic and not restricted to one JSON object or one course slug. |
| FR-ALP-CATALOGUE-003 | Each catalogue card shall show learner-specific enrolment state. | Enrolled, Pending, Not enrolled and Revoked are presented distinctly. |
| FR-ALP-CATALOGUE-004 | Catalogue actions shall be state-aware. | Continue course, Enrolment pending, Enrol now/View course, or Access revoked/contact administrator is shown as applicable. |
| FR-ALP-CATALOGUE-005 | Administration navigation shall be authorization-aware. | Admin link and routes are inaccessible to learners without the existing `admin` role. |
| FR-ALP-CATALOGUE-006 | Legacy routes shall be inventoried and redirected before removal. | Redirect matrix and tests exist; no known external route is silently deleted. |

## Invitation and manual enrolment requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-INVITE-001 | Authorized administrators shall create course invitations for one or more learner emails. | Invitation captures recipient, course scope, issuer, basis, mandatory reason, expiry and optional reference/company. |
| FR-ALP-INVITE-002 | The invitation basis shall support external payment, corporate order, complimentary marketing, internal allocation and other. | Selected basis is stored and visible in the audit record. |
| FR-ALP-INVITE-003 | Invitations shall use secure opaque, unguessable tokens. | Raw token is shown/transmitted only as required; persisted representation is hashed or equivalently protected. |
| FR-ALP-INVITE-004 | Invitation redemption shall be email-bound and expiry-aware. | Wrong email, expired, revoked, invalid or reused invitation cannot grant enrolment. |
| FR-ALP-INVITE-005 | Successful redemption shall create or update the course enrolment idempotently. | Repeated valid requests do not create duplicate enrolments or events. |
| FR-ALP-INVITE-006 | Every invitation lifecycle event shall be auditable. | Created, sent, redeemed, expired, revoked and failed redemption events record actor/time/reason/context. |
| FR-ALP-INVITE-007 | Complimentary access shall require a recorded reason. | No complimentary enrolment can be issued with an empty reason. |
| FR-ALP-INVITE-008 | External-payment access shall allow a recorded commercial reference. | Order/company/reference can be captured and audited without storing sensitive payment data. |

## Access management requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-ACCESS-MGMT-001 | Authorized administrators shall revoke and reinstate a learner-course enrolment. | Reason is mandatory and enrolment/event timestamps are updated consistently. |
| FR-ALP-ACCESS-MGMT-002 | Revoked learners shall not access governed course or unit content. | Course and unit routes deny access and show revoked state. |
| FR-ALP-ACCESS-MGMT-003 | Reinstatement shall restore access only through a governed action. | Reinstatement actor, reason and prior/next state are recorded. |

## Checkout and payment requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-CHECKOUT-001 | A not-enrolled learner shall be able to initiate checkout for an eligible course. | Course, learner, currency and payable amount are bound to a server-created transaction. |
| FR-ALP-CHECKOUT-002 | Browser redirect or client success state shall not grant enrolment. | Access is created only after authoritative provider confirmation. |
| FR-ALP-CHECKOUT-003 | Payment confirmation handling shall be authenticated, idempotent and auditable. | Duplicate webhook delivery cannot duplicate enrolment; signature verification and event records exist. |
| FR-ALP-CHECKOUT-004 | Failed, cancelled, disputed or unknown payment shall fail closed. | No governed content is exposed without confirmed entitlement. |
| FR-ALP-CHECKOUT-005 | Administrators shall have a reconciliation view for payment/enrolment exceptions. | Unmatched, duplicate and failed events are visible without exposing sensitive payment data. |

## Offer-code requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-OFFER-001 | Authorized administrators shall create percentage, fixed-value and 100% complimentary offers. | Offer type, amount, currency where applicable, issuer and reason are recorded. |
| FR-ALP-OFFER-002 | Offers shall support course-specific or catalogue-wide scope. | Ineligible course redemption is rejected. |
| FR-ALP-OFFER-003 | Offers shall support validity dates, total redemption limit, per-user limit and active/revoked state. | Limits are enforced atomically. |
| FR-ALP-OFFER-004 | Offer redemption shall be auditable and resistant to code guessing. | Stored code representation is protected; attempts and successful redemption are recorded. |

## Sequencing and implementation boundary

The first authorized build after this prebuild merges is W4.2 admin role enablement, invitation/manual enrolment, generic catalogue/sidebar and legacy redirect inventory. W4.3 payment and offer-code implementation remains a later sandbox-controlled build. No implementation may begin without a QA-to-Red suite mapped to these requirements.