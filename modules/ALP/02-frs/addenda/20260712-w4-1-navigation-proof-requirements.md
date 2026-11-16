# FRS Addendum - W4.1 Navigation Proof Requirements

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/02-frs/functional-requirements.md` |
| Addendum ID | FRS-ALP-W4-1-NAV-20260712 |
| Date | 2026-07-12 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-1-nav-proof-prebuild` |

---

## New Functional Requirement Group

| Group ID | Requirement Area | UX Source | Status |
|---|---|---|---|
| FR-ALP-NAV | Learner navigation/sidebar and proof route access | UJ-ALP-021 | Defined for W4.1 proof enabler |

---

## Functional Requirements

| Requirement ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ALP-NAV-001 | The system shall provide a persistent learner sidebar or equivalent navigation shell for signed-in learner pages. | Must | Dashboard, Profile, Public Level 0 landing, Gated Level 0 course, first gated unit, and Sign out are visible without relying on footer-only links. |
| FR-ALP-NAV-002 | The navigation shell shall distinguish public course landing routes from governed learner routes. | Must | Learner/reviewer can identify `/courses/vpshr-level-0` as public and `/learn/vpshr-level-0` as governed. |
| FR-ALP-NAV-003 | The navigation shell shall prevent dashboard/denied-state loop trapping. | Must | From dashboard, denied state, profile, and public landing, the learner can reach an intended next route or sign out. |
| FR-ALP-NAV-004 | The navigation shell shall provide a visible sign-out control. | Must | Sign-out clears session and returns to `/alp-sign-in`. |
| FR-ALP-NAV-005 | The navigation shell shall be accessible and responsive. | Must | Sidebar/navigation uses semantic landmarks or controls and remains usable on narrow screens. |

---

## Implementation Boundary

The next implementation slice may implement only the sidebar/navigation shell and loop-breaker required for W4.1 UI proof. It must not claim W4.1 final closure, W4 closure, W4.2 start, payment readiness, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS, deployment acceptance, or production readiness.
