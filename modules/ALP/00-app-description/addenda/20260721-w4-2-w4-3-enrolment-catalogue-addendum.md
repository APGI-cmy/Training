# App Description Addendum - W4.2/W4.3 Enrolment and Course Catalogue

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/00-app-description/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md` |
| Addendum ID | AD-ALP-W4-2-W4-3-ENROL-20260721 |
| Date | 2026-07-21 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |

## Trigger and accepted browser evidence

Post-merge browser testing of PR #92 confirmed that the learner sidebar appears on dashboard and profile pages, public and governed routes are visibly distinct, the not-enrolled state blocks governed course access, and the denied-state recovery actions work. The navigation-loop finding is therefore resolved for the observed not-enrolled path.

The browser evidence also confirmed that the current navigation and catalogue are too tightly coupled to VPSHR Level 0 and that no governed method yet exists to create, invite, grant, revoke, or pay for enrolment.

## Product direction

The ALP shall operate as a multi-course learning platform. VPSHR Level 0 is one course, not the permanent platform identity or sole navigation target. The catalogue and learner navigation must scale to VPSHR Levels 0-2, the Scannex Training Programme, and future courses.

Learners may obtain course access through two governed routes:

1. **Administrator invitation/manual enrolment** for corporate orders, payment received outside the platform, complimentary marketing access, internal allocation, or another recorded reason.
2. **Public self-enrolment** through an approved e-commerce checkout, with access granted only after authoritative payment or approved zero-price offer verification.

## Required platform capabilities

- Generic learner navigation: Dashboard, My learning, Course catalogue, Profile, Administration when authorized, and Sign out.
- Catalogue cards for every published course with learner-specific state: Enrolled, Pending, Not enrolled, or Revoked.
- Contextual action: Continue course, Enrolment pending, Enrol now/View course, or Access revoked/contact administrator.
- W4.2 administrator invitation and manual enrolment management with mandatory reason, course scope, expiry, audit trail, revocation and reinstatement.
- W4.3 public paid self-enrolment with payment-provider webhook authority, idempotency, failure-safe denial and reconciliation evidence.
- Governed complimentary and discount/access-code instruments with scope, expiry, redemption limits, issuer, reason and revocation.
- Secure opaque invitation and offer tokens; raw secrets must not be stored or logged where a hash or derived identifier is sufficient.
- Legacy public landing routes must be inventoried and redirected before removal so existing external links are not silently broken.

## Administrative authority boundary

The existing `admin` role shall be used rather than creating an ungoverned parallel role model. Assignment of `admin` to `johan.ras@apginc.ca` is authorized only after this prebuild is reviewed and merged and the W4.2 implementation QA-to-Red suite is filed.

## Governance boundary

This addendum is prebuild authority only. It does not itself authorize application code, database migrations, live role assignment, invitation dispatch, payment integration, discount issuance, legacy-route deletion, W4.1 closure, W4 closure, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS, deployment acceptance, payment readiness or production readiness.