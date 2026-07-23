# App Description Addendum - W4.2 Enrolment, Catalogue, and W4.3-W4.5 Payment Roadmap

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/00-app-description/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md` |
| Addendum ID | AD-ALP-W4-2-W4-5-ENROL-20260721 |
| Date | 2026-07-21 |
| Status | Merged/accepted by PR #93 |
| Merge Evidence | `721be18e88d284ffffc4179e71e3dd936b14a319` |

## Trigger and accepted browser evidence

Post-merge browser testing of PR #92 confirmed the learner sidebar on dashboard and profile pages, public/governed route distinction, governed denial for a learner with no enrolment row, working denied-state recovery actions, and usable narrow-view navigation. The navigation-loop finding is resolved for the observed not-enrolled path.

The browser evidence also confirmed that navigation and catalogue content remain too tightly coupled to VPSHR Level 0 and that no governed method yet exists to invite, grant, revoke or reinstate course enrolment.

## Product direction

The ALP shall operate as a multi-course learning platform. VPSHR Level 0 is one course, not the permanent platform identity or sole navigation target. The catalogue and learner navigation must scale to VPSHR Levels 0-2, the Scannex Training Programme and future courses.

Learners may obtain course access through two governed routes:

1. Administrator invitation/manual enrolment for corporate orders, payment received outside the platform, complimentary marketing access, internal allocation or another recorded reason.
2. Public self-enrolment through an approved e-commerce process implemented only through the existing payment-wave sequence.

## Required platform capabilities

- Generic learner navigation: Dashboard, My learning, Course catalogue, Profile, Administration when authorized, and Sign out.
- Catalogue cards for every published course with learner-specific state: Enrolled, Pending, Not enrolled or Revoked.
- Contextual actions: Continue course, Enrolment pending, Enrol now/View course, or Access revoked/contact administrator.
- W4.2 administrator invitations and manual enrolment with mandatory reason, course scope, expiry, audit trail, revocation and reinstatement.
- Secure opaque invitation tokens; raw secrets must not be stored or logged where a protected representation is sufficient.
- Legacy public landing routes must be inventoried and redirected before removal.

## Payment-wave sequencing

This addendum preserves GOV-ALP-085 and does not supersede it:

- W4.3 defines the payment status model and audit trail only.
- W4.4 selects the payment provider and records architecture, security and risk controls.
- W4.5 implements sandbox payment execution only after W4.1-W4.4 are accepted.
- Checkout, provider webhooks and payment-linked enrolment are not authorized by this PR.
- Discount and complimentary offer-code execution belongs to the later governed payment/commercial sequence and requires separate prebuild and QA authorization.

## Administrative authority boundary

The existing `admin` role shall be reused. Assignment of `admin` to `johan.ras@apginc.ca` is authorized only after this prebuild is merged and executable W4.2 QA-to-Red tests are filed.

## Governance boundary

This addendum is prebuild authority only. It does not itself authorize application code, database migrations, live role assignment, invitation dispatch, payment integration, discount issuance, legacy-route deletion, W4.1 closure, W4 closure, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS, deployment acceptance, payment readiness or production readiness.
