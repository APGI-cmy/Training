# GOV-ALP-094 - W4.2 Enrolment/Catalogue Prebuild and W4.3-W4.5 Payment Roadmap

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.2 administrator enrolment; W4.3-W4.5 payment roadmap |
| Evidence Type | Prebuild decision and browser-finding record |
| Date | 2026-07-21 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |
| Repository | APGI-cmy/Training |

## Accepted post-PR #92 browser evidence

User-supplied browser screenshots confirm:

1. learner sidebar on dashboard and profile;
2. working Dashboard and Profile navigation;
3. public Level 0 landing access;
4. governed denial for `/learn/vpshr-level-0` with no enrolment row;
5. `not enrolled` status and Dashboard, Profile, public landing and Sign out recovery actions; and
6. usable stacked navigation at narrow viewport.

The navigation-loop blocker is resolved for the tested not-enrolled path. W4.1 final closure remains held because controlled enrolled, pending, revoked and unknown/error proof is outstanding.

## Repository and live-platform findings

- PR #92 merged as `a0c0944a8399c97c90817916f74140c5369daede`; Vercel passed.
- Course source remains hard-coded to one VPSHR Level 0 object although `/courses` has catalogue structure.
- Live Supabase includes `profiles`, `user_roles`, `course_enrolments` and `course_enrolment_events`.
- Existing roles include `learner`, `admin`, `reviewer` and `course_publisher`.
- Enrolment states include `pending`, `enrolled` and `revoked`.
- Enrolment sources include `manual`, `admin`, `payment`, `migration` and `system`.
- The authenticated account `johan.ras@apginc.ca` exists.
- No live role, enrolment, invitation, payment or offer-code write was made during this review.

## Authoritative sequencing decision

GOV-ALP-085 remains authoritative and is not superseded:

| Slice | Authorized purpose | Current posture |
|---|---|---|
| W4.2 | Generic catalogue/sidebar, administrator invitation/manual enrolment, revoke/reinstate and legacy redirect inventory | Prebuild filed; executable RED required before build |
| W4.3 | Payment status model and audit trail | Requirements roadmap only; no provider execution authorized |
| W4.4 | Payment provider selection plus architecture, security, privacy and risk decision | Not started |
| W4.5 | Sandbox payment execution after W4.1-W4.4 acceptance | Not started; checkout/webhooks/offer execution blocked |

## Next governed implementation sequence

1. merge this prebuild-only PR;
2. file executable W4.2 QA-ALP-252 through QA-ALP-267 tests and prove correct RED;
3. implement only the W4.2 generic catalogue/sidebar, redirect inventory, existing-role-based admin authorization, invitations/manual enrolment and revoke/reinstate controls;
4. assign `admin` to `johan.ras@apginc.ca` only as a controlled W4.2 implementation/proof action;
5. build W4.2 to green and capture controlled enrolled, pending and revoked proof with exact rows and cleanup; and
6. open separate reviewed cycles for W4.3, W4.4 and W4.5 in that order.

## Security and audit controls

- Reuse the existing `admin` role; do not invent a parallel super-admin flag.
- Invitation secrets must be opaque and unguessable; persisted representations must be protected.
- Complimentary access requires issuer, reason, course scope and expiry/audit evidence.
- External-payment access requires a recorded basis/reference without sensitive card data.
- Invitation redemption and enrolment transitions must be idempotent and auditable.
- RLS and server-side authorization must enforce write paths.
- Payment entitlement may eventually follow authoritative provider confirmation only, but that execution is W4.5 authority, not W4.3.

## Legacy route decision

Legacy landing pages are candidates for retirement, not immediate deletion. W4.2 must first create a route inventory and tested redirect matrix. Only safely redirected obsolete routes may be removed.

## Explicit non-claims

This prebuild does not claim or perform live admin assignment, executable RED completion, implementation, migrations, invitation dispatch, enrolment creation, provider integration, offer-code execution, payment readiness, W4.1 closure, W4 closure, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS, deployment acceptance or production readiness.
