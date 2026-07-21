# QA-to-Red Expansion Plan - W4.2 Enrolment, Catalogue, and W4.3-W4.5 Payment Roadmap

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Stage | 6 - QA-to-Red |
| Parent Artifact | `modules/ALP/05-qa-to-red/qa-to-red.md` |
| Date | 2026-07-21 |
| Status | Prebuild QA specification only; executable tests not yet filed |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |

## QA rule

Only QA-ALP-252 through QA-ALP-267 may be converted into executable RED tests immediately after this prebuild merges. Payment QA remains staged: W4.3 status-model QA requires a later cycle, W4.4 is a provider/risk decision gate, and W4.5 execution QA remains blocked until W4.1-W4.4 are accepted.

## W4.2 catalogue and navigation QA

| QA ID | RED condition | GREEN acceptance |
|---|---|---|
| QA-ALP-252 | Sidebar remains course-specific. | Sidebar exposes Dashboard, My learning, Course catalogue, Profile, authorized Administration and Sign out. |
| QA-ALP-253 | Course source supports one hard-coded course. | Catalogue renders at least two published course records through a generic source. |
| QA-ALP-254 | Catalogue lacks learner-specific state. | Enrolled, Pending, Not enrolled and Revoked states render with correct action. |
| QA-ALP-255 | Non-admin can see or reach Administration. | Admin navigation and routes fail closed for non-admin users. |
| QA-ALP-256 | Legacy route inventory/redirect matrix is absent. | Every approved legacy route has a tested redirect or retained-route decision. |

## W4.2 invitation QA

| QA ID | RED condition | GREEN acceptance |
|---|---|---|
| QA-ALP-257 | Admin cannot create a course invitation. | Authorized admin creates invitation with recipient, course, basis, reason and expiry. |
| QA-ALP-258 | Complimentary or external-payment invitation accepts missing reason. | Empty reason is rejected server-side and client-side. |
| QA-ALP-259 | Invitation token is stored or logged raw. | Persisted representation is protected and logs are secret-safe. |
| QA-ALP-260 | Invalid, expired, revoked, reused or email-mismatched invitation can redeem. | Every negative path fails closed and records an event. |
| QA-ALP-261 | Valid redemption is non-idempotent. | Repeated redemption cannot duplicate enrolment or events. |
| QA-ALP-262 | Invitation lifecycle lacks audit evidence. | Created, sent, redeemed, expired, revoked and failed events include actor, time and context. |
| QA-ALP-263 | Batch invitation has no per-recipient validation. | Approved batch path records each recipient outcome. |

## W4.2 access-management QA

| QA ID | RED condition | GREEN acceptance |
|---|---|---|
| QA-ALP-264 | Revoke/reinstate can occur without reason or actor evidence. | Reason, actor and previous/next state are mandatory. |
| QA-ALP-265 | Revoked learner can access course or unit. | Both governed routes deny and show revoked state. |
| QA-ALP-266 | Reinstatement does not restore access consistently. | Governed reinstatement restores access with an audit event. |
| QA-ALP-267 | Pending state exposes gated content. | Pending learner receives governed denial on course and unit routes. |

## Reserved payment QA roadmap

| QA range | Governing slice | Boundary |
|---|---|---|
| QA-ALP-268 to QA-ALP-272 | W4.3 payment status model | Reserved for explicit status, transitions, audit and fail-closed entitlement tests; no checkout/webhook execution. |
| QA-ALP-273 | W4.4 provider/risk decision | Reserved for proof that provider architecture, security, privacy, reconciliation and sandbox exit criteria are approved. |
| QA-ALP-274 to QA-ALP-276 | W4.5 execution/offer controls | Reserved for later sandbox checkout, authoritative confirmation, idempotency and governed offer-code tests after W4.4 acceptance. |

## Regression and proof obligations

- Existing authentication, profile, progress, completion and W4.1 access-gating tests remain green.
- W4.2 browser proof includes learner/admin views, narrow viewport, invitation positive/negative paths, catalogue transitions, revocation/reinstatement and redirects.
- Database proof verifies RLS, role boundaries, constraints, token protection, event history and absence of unintended write policies.
- Any live test data is identified before creation and cleaned up after proof.

## Boundary

This plan creates no executable tests, code, migrations, admin rights, invitations, payments or offer codes. Payment execution is not authorized.
