# GOV-ALP-094 - W4.2/W4.3 Enrolment and Catalogue Prebuild Decision

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.2 administrator enrolment / W4.3 paid self-enrolment |
| Evidence Type | Prebuild decision and browser-finding record |
| Date | 2026-07-21 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-2-w4-3-enrolment-catalogue-prebuild` |
| Repository | APGI-cmy/Training |

## Accepted post-PR #92 browser evidence

User-supplied browser screenshots confirm:

1. the learner sidebar renders on the dashboard;
2. the learner sidebar renders on the profile page;
3. Dashboard and Profile navigation work;
4. Public Level 0 opens the public course landing route;
5. the governed `/learn/vpshr-level-0` route blocks a learner with no enrolment row;
6. the denied state reports `not enrolled` and provides Dashboard, Profile, public landing and Sign out recovery actions; and
7. the narrow viewport renders a stacked learner navigation region.

The observed navigation-loop blocker is therefore resolved for the tested not-enrolled path. W4.1 final closure remains held because controlled enrolled, pending, revoked and unknown/error proof is still outstanding.

## Repository and live-platform findings

- PR #92 merged as `a0c0944a8399c97c90817916f74140c5369daede` and its Vercel deployment passed.
- The current course source is still hard-coded to a single VPSHR Level 0 JSON object.
- The public `/courses` route is already shaped as a catalogue but currently receives only that one course.
- Live Supabase includes `profiles`, `user_roles`, `course_enrolments` and `course_enrolment_events`.
- Existing role values include `learner`, `admin`, `reviewer` and `course_publisher`.
- Existing enrolment states include `pending`, `enrolled` and `revoked`.
- Existing enrolment sources include `manual`, `admin`, `payment`, `migration` and `system`.
- The authenticated account `johan.ras@apginc.ca` exists.
- No live admin-role assignment, enrolment write, invitation record, payment record or offer code was created during this prebuild investigation.

## Decision

The next governed implementation sequence is:

1. merge this prebuild-only PR;
2. file executable W4.2 QA-to-Red tests mapped to QA-ALP-252 through QA-ALP-267;
3. implement generic catalogue/sidebar, legacy-route redirect inventory, existing-role-based admin authorization, invitations/manual enrolment and revoke/reinstate controls;
4. assign `admin` to `johan.ras@apginc.ca` only as a controlled implementation/proof action after the QA-to-Red suite is present;
5. build to green and capture controlled enrolled, pending and revoked proof, with exact live rows and cleanup recorded; and
6. open a later W4.3 sandbox-controlled cycle for checkout, payment-provider confirmation and offer codes mapped to QA-ALP-268 through QA-ALP-276.

## Security and audit controls

- Reuse the existing `admin` role; do not invent an ungoverned super-admin flag.
- Invitation and offer secrets must be opaque and unguessable; persisted representations must be hashed or equivalently protected.
- Complimentary access requires issuer, reason, course scope and expiry/audit evidence.
- External-payment access requires a recorded basis/reference but must not store sensitive payment-card data.
- Payment access must be based on authoritative provider confirmation, not browser redirect state.
- Invitation redemption, enrolment transitions, revocation, reinstatement, payment confirmation and offer redemption must be idempotent and auditable.
- RLS and server-side authorization must enforce all write paths.

## Legacy route decision

Legacy landing pages are candidates for retirement, not immediate deletion. The W4.2 build must first create a route inventory and tested redirect matrix. Only routes confirmed obsolete and safely redirected may be removed.

## Explicit non-claims

This prebuild does not claim or perform:

- live admin assignment;
- executable QA-to-Red completion;
- application or database implementation;
- invitation dispatch or enrolment creation;
- payment integration or payment readiness;
- offer-code implementation;
- W4.1 final closure;
- W4 closure;
- CODE_PASS, FUNCTIONAL_PASS or CWT_PASS;
- deployment acceptance; or
- production readiness.