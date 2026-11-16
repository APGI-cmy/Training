# Requirement Registry Addendum - W4.1 Navigation Proof

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Parent Artifact | `modules/ALP/REQUIREMENT_REGISTRY.md` |
| Addendum ID | REG-ALP-W4-1-NAV-20260712 |
| Date | 2026-07-12 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-1-nav-proof-prebuild` |

---

## Traceability Additions

| Trace Item | Value |
|---|---|
| Change Driver | Post-PR #90 browser proof found dashboard/denied-state navigation loop and footer-only navigation weakness. |
| New UX ID | UJ-ALP-021 |
| New FR Group | FR-ALP-NAV |
| Source App Addendum | `modules/ALP/00-app-description/addenda/20260712-w4-1-navigation-proof-addendum.md` |
| Source UX Addendum | `modules/ALP/01-ux-workflow-wiring/addenda/20260712-w4-1-navigation-proof-addendum.md` |
| Source FRS Addendum | `modules/ALP/02-frs/addenda/20260712-w4-1-navigation-proof-requirements.md` |
| Required Evidence | Browser screenshots showing sidebar navigation, sign-out, public/gated route distinction, loop removal, and later access-state proof. |
| Closure Boundary | Does not close W4.1 until access-state browser proof is accepted. |

---

## Registry Mapping

| UX ID | Journey | FR Group | QA / Evidence Direction |
|---|---|---|---|
| UJ-ALP-021 | Learner uses persistent navigation/sidebar to move between dashboard, profile, public course landing, governed course shell, governed unit viewer, and sign-out without a loop | FR-ALP-NAV, FR-ALP-COURSE, FR-ALP-AUTH | W4.1 navigation/sidebar browser proof |

---

## Non-Claims

This registry addendum does not authorize final W4.1 closure, W4 closure, W4.2 start, payment readiness, CODE_PASS, FUNCTIONAL_PASS, CWT_PASS, deployment acceptance, or production readiness.
