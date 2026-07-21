# QA-to-Red Plan - W4.2/W4.3 Enrolment and Course Catalogue

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Date | 2026-07-21 |
| Status | Prebuild QA specification only; executable tests not yet filed |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |

## QA rule

No W4.2 or W4.3 implementation may begin until the applicable executable tests below are added and demonstrably fail for the missing behaviour. The implementation must then be built only until the authorized tests and existing regression suite are green.

## W4.2 catalogue and navigation QA

| QA ID | Red condition to establish before build | Green acceptance |
|---|---|---|
| QA-ALP-252 | Sidebar contains course-specific VPSHR Level 0 links instead of generic navigation. | Sidebar exposes Dashboard, My learning, Course catalogue, Profile, authorized Administration and Sign out. |
| QA-ALP-253 | Course source supports only one hard-coded course. | Catalogue renders at least two published course records through a generic source. |
| QA-ALP-254 | Catalogue cards do not show learner-specific enrolment state. | Enrolled, Pending, Not enrolled and Revoked states render with correct action. |
| QA-ALP-255 | Learner can see or reach Administration without admin authorization. | Admin navigation and routes are denied to non-admin users. |
| QA-ALP-256 | Legacy route inventory/redirect matrix is absent. | Every approved legacy route has a tested redirect or explicit retained-route decision. |

## W4.2 admin invitation QA

| QA ID | Red condition to establish before build | Green acceptance |
|---|---|---|
| QA-ALP-257 | Admin cannot create a course invitation. | Authorized admin creates invitation with recipient, course, basis, reason and expiry. |
| QA-ALP-258 | Complimentary or external-payment invitation accepts missing reason. | Empty reason is rejected server-side and client-side. |
| QA-ALP-259 | Invitation token is stored or logged in raw form. | Persisted token representation is hashed/protected and raw token is not emitted in logs. |
| QA-ALP-260 | Invalid, expired, revoked, reused or email-mismatched invitation can redeem. | Every negative path fails closed and records a governed event. |
| QA-ALP-261 | Valid invitation redemption is non-idempotent. | Repeated redemption cannot duplicate enrolment or audit events. |
| QA-ALP-262 | Invitation lifecycle lacks audit evidence. | Created, sent, redeemed, expired, revoked and failed events include actor/time/context. |
| QA-ALP-263 | Admin cannot batch invite approved recipients. | Approved batch path validates each recipient and records per-recipient outcome. |

## W4.2 access management QA

| QA ID | Red condition to establish before build | Green acceptance |
|---|---|---|
| QA-ALP-264 | Revoke/reinstate can occur without reason or actor evidence. | Mandatory reason, actor and previous/next state are recorded. |
| QA-ALP-265 | Revoked learner can still access course shell or unit viewer. | Both governed routes deny access and show revoked state. |
| QA-ALP-266 | Reinstatement does not restore access consistently. | Governed reinstatement restores course and unit access with audit event. |
| QA-ALP-267 | Pending state exposes gated content. | Pending learner receives governed denial on course and unit routes. |

## W4.3 checkout QA

| QA ID | Red condition to establish before build | Green acceptance |
|---|---|---|
| QA-ALP-268 | Browser success redirect can create enrolment. | Only verified provider confirmation grants access. |
| QA-ALP-269 | Webhook signature or authenticity is not verified. | Invalid provider event is rejected and logged safely. |
| QA-ALP-270 | Duplicate provider delivery creates duplicate enrolment/events. | Idempotency prevents duplicate commercial or enrolment records. |
| QA-ALP-271 | Failed, cancelled, disputed or unknown payment exposes content. | All non-confirmed states fail closed. |
| QA-ALP-272 | Payment/enrolment mismatch is invisible to administrators. | Reconciliation view exposes governed exceptions without sensitive payment data. |

## W4.3 offer-code QA

| QA ID | Red condition to establish before build | Green acceptance |
|---|---|---|
| QA-ALP-273 | Offer scope, expiry or redemption limits are not enforced. | Course scope, dates, total limit and per-user limit are enforced atomically. |
| QA-ALP-274 | Revoked offer remains redeemable. | Revoked/inactive offer fails closed. |
| QA-ALP-275 | Raw offer code is stored or exposed in logs. | Protected representation is persisted and logs are secret-safe. |
| QA-ALP-276 | 100% complimentary offer bypasses issuer/reason audit. | Issuer, reason, course scope and redemption event are mandatory. |

## Regression and proof obligations

- Existing authentication, profile, progress, completion and W4.1 access-gating tests must remain green.
- Browser proof must include learner and admin views, narrow viewport, valid and negative invitation flows, catalogue state transitions, revocation/reinstatement and legacy redirects.
- Database proof must verify RLS, role boundaries, constraints, token protection, event history and absence of unintended write policies.
- Any live test data must be identified before creation and cleaned up after proof.

## Boundary

This plan defines QA-to-Red obligations only. It does not itself create executable tests, application code, migrations, admin rights, invitations, payments or offer codes.