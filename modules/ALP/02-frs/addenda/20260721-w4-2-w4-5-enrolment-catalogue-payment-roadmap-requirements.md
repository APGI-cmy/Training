# FRS Addendum - W4.2 Enrolment, Catalogue, and W4.3-W4.5 Payment Roadmap

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/02-frs/functional-requirements.md` |
| Addendum ID | FRS-ALP-W4-2-W4-5-ENROL-20260721 |
| Date | 2026-07-21 |
| Status | Merged/accepted by PR #93 |
| Merge Evidence | `721be18e88d284ffffc4179e71e3dd936b14a319` |

## Functional requirement groups

| Group ID | Area | Governing slice |
|---|---|---|
| FR-ALP-CATALOGUE | Generic multi-course catalogue, navigation and legacy redirects | W4.2 |
| FR-ALP-INVITE | Administrator invitations and manual enrolment | W4.2 |
| FR-ALP-ACCESS-MGMT | Revocation, reinstatement and audit trail | W4.2 |
| FR-ALP-PAYMENT-STATUS | Payment lifecycle model and audit history | W4.3 |
| FR-ALP-PAYMENT-DECISION | Provider, architecture, security and risk decision | W4.4 |
| FR-ALP-CHECKOUT | Sandbox checkout and authoritative payment confirmation | W4.5 |
| FR-ALP-OFFER | Complimentary and discount/access codes | W4.5 or later separately authorized commercial slice |

## W4.2 catalogue and navigation requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-CATALOGUE-001 | The system shall support multiple published courses without hard-coded VPSHR Level 0 navigation. | Navigation uses Dashboard, My learning, Course catalogue, Profile, authorized Administration and Sign out. |
| FR-ALP-CATALOGUE-002 | The catalogue shall list every published course available to the current audience. | Course source is generic and not restricted to one object or slug. |
| FR-ALP-CATALOGUE-003 | Each catalogue card shall show learner-specific enrolment state. | Enrolled, Pending, Not enrolled and Revoked are distinct. |
| FR-ALP-CATALOGUE-004 | Catalogue actions shall be state-aware. | Continue course, Enrolment pending, Enrol now/View course, or Access revoked/contact administrator appears as applicable. |
| FR-ALP-CATALOGUE-005 | Administration navigation shall be authorization-aware. | Admin links and routes are inaccessible without the existing `admin` role. |
| FR-ALP-CATALOGUE-006 | Legacy routes shall be inventoried and redirected before removal. | A redirect matrix and tests exist; no known external route is silently deleted. |

## W4.2 invitation and manual enrolment requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-INVITE-001 | Authorized administrators shall create course invitations for one or more learner emails. | Recipient, course scope, issuer, basis, mandatory reason, expiry and optional reference/company are captured. |
| FR-ALP-INVITE-002 | Invitation basis shall support external payment, corporate order, complimentary marketing, internal allocation and other. | Basis is stored and auditable. |
| FR-ALP-INVITE-003 | Invitations shall use opaque, unguessable tokens. | Raw token exposure is minimized; persisted representation is protected. |
| FR-ALP-INVITE-004 | Redemption shall be email-bound, expiry-aware and single-use according to approved rules. | Wrong email, expired, revoked, invalid or reused invitation fails closed. |
| FR-ALP-INVITE-005 | Successful redemption shall create or update enrolment idempotently. | Repeated requests cannot duplicate enrolment or events. |
| FR-ALP-INVITE-006 | Every invitation lifecycle event shall be auditable. | Created, sent, redeemed, expired, revoked and failed events record actor, time and context. |
| FR-ALP-INVITE-007 | Complimentary access shall require a recorded reason. | Empty reason is rejected. |
| FR-ALP-INVITE-008 | External-payment access shall allow a commercial reference without sensitive card data. | Order/company/reference is auditable and data-minimized. |

## W4.2 access-management requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-ACCESS-MGMT-001 | Authorized administrators shall revoke and reinstate a learner-course enrolment. | Reason, actor and previous/next state are mandatory. |
| FR-ALP-ACCESS-MGMT-002 | Revoked learners shall not access governed course or unit content. | Both governed routes deny access and show revoked state. |
| FR-ALP-ACCESS-MGMT-003 | Reinstatement shall restore access only through a governed action. | Actor, reason and transition event are recorded. |

## W4.3 payment-status requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-PAYMENT-STATUS-001 | The system shall model payment states explicitly. | Pending, paid, failed, cancelled, refunded, disputed and unknown states are represented without inference from browser UI. |
| FR-ALP-PAYMENT-STATUS-002 | Payment-state transitions shall be auditable and idempotent. | Actor/source, prior state, next state, timestamp and correlation identifier are recorded. |
| FR-ALP-PAYMENT-STATUS-003 | Course entitlement shall fail closed for non-authoritative payment states. | No paid-course access is granted from pending, failed, cancelled, refunded, disputed or unknown state. |
| FR-ALP-PAYMENT-STATUS-004 | W4.3 shall not implement provider checkout or webhooks. | No provider-specific execution exists before W4.4 approval. |

## W4.4 provider-decision requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-PAYMENT-DECISION-001 | A provider selection and architecture decision shall precede payment execution. | Provider, integration pattern, environments and ownership are approved. |
| FR-ALP-PAYMENT-DECISION-002 | Security, privacy and operational risks shall be accepted before W4.5. | Signature/authentication, secrets, data minimization, refunds, disputes, reconciliation and incident handling are documented. |
| FR-ALP-PAYMENT-DECISION-003 | Sandbox exit criteria shall be defined. | Required functional, security and reconciliation proof is explicit before any live-payment claim. |

## W4.5 execution requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-ALP-CHECKOUT-001 | A not-enrolled learner may initiate sandbox checkout only after W4.4 approval. | Course, learner, currency and amount bind to a server-created transaction. |
| FR-ALP-CHECKOUT-002 | Browser success shall not grant enrolment. | Entitlement follows authoritative provider confirmation only. |
| FR-ALP-CHECKOUT-003 | Provider confirmation shall be authenticated, idempotent and auditable. | Invalid or duplicate events cannot create entitlement. |
| FR-ALP-CHECKOUT-004 | Failed, cancelled, disputed or unknown payment shall fail closed. | Governed content remains inaccessible. |
| FR-ALP-CHECKOUT-005 | Administrators shall reconcile payment/enrolment exceptions. | Unmatched and failed events are visible without sensitive payment data. |
| FR-ALP-OFFER-001 | Offer-code execution requires separate W4.5 or later commercial authorization. | Scope, expiry, limits, issuer, reason, revocation and protected code representation are governed before use. |

## Sequencing and implementation boundary

After this prebuild merges, only W4.2 executable QA-to-Red and the subsequent W4.2 build may start. W4.3 is limited to a later payment-status-model cycle. W4.4 must approve the provider and risks. W4.5 payment or offer-code execution remains blocked until W4.1-W4.4 are accepted and separate QA-to-Red authority is filed.
