# UX Workflow Addendum - W4.1 Navigation Proof

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md` |
| Addendum ID | UX-ALP-W4-1-NAV-20260712 |
| Date | 2026-07-12 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-1-nav-proof-prebuild` |

---

## New UX Journey

| Journey ID | Workflow | Primary Actor | CWT Required | Status |
|---|---|---|---|---|
| UJ-ALP-021 | Learner uses persistent navigation/sidebar to move between dashboard, profile, public course landing, governed course shell, governed unit viewer, and sign-out without a loop | Learner | Yes | Defined for W4.1 proof enabler |

---

## Required Sidebar / Navigation Links

The signed-in learner navigation shell must expose:

- Dashboard: `/dashboard`
- Profile: `/profile`
- Public Level 0 landing: `/courses/vpshr-level-0`
- Gated Level 0 course: `/learn/vpshr-level-0`
- Gated first unit: `/learn/vpshr-level-0/units/[unitSlug]`
- Sign out: clears session and returns to `/alp-sign-in`

---

## Loop-Breaker UX Rule

The learner must not be trapped in a loop between dashboard, denied state, and footer links. From dashboard, profile, public landing, governed course route, governed unit route, and denied state, the learner must be able to either:

1. move to a proof-critical route;
2. return to dashboard/profile;
3. reach the public landing route; or
4. sign out.

---

## Browser Proof Obligations

After implementation, browser proof must show:

- sidebar/navigation is visible on signed-in learner pages;
- sign-out resets the learner session;
- public and governed routes are distinguishable;
- Gated Level 0 and the first gated unit are reachable where enrolment allows access;
- denied states do not trap the learner; and
- final W4.1 access-state proof remains separately required.
