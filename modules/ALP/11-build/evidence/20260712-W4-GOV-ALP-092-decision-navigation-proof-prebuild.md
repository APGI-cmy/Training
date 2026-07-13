# W4.1 Navigation Proof Prebuild Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | Prebuild artifact addenda for navigation/sidebar proof enabler |
| Date | 2026-07-12 |
| Status | Filed for prebuild review |
| Branch | `alp-w4-1-nav-proof-prebuild` |
| Repository | APGI-cmy/Training |
| Driver | Post-PR #90 browser proof found navigation loop and footer-only route access weakness |

---

## Decision

Prebuild artifact addenda are filed before any further app-code changes.

The next implementation slice must add or revise the learner navigation/sidebar shell and resolve the dashboard/denied-state navigation loop before final W4.1 browser proof can be captured.

---

## Browser Findings Recorded

User supplied screenshots and observations showing:

1. Sign-out button is visible after PR #90 deployment.
2. Sign-out returns to `/alp-sign-in`.
3. A different signed-in learner reaches a different profile/dashboard context.
4. Dashboard and footer navigation currently create a locked-circle experience where Open Dashboard, Return to dashboard, and Gated Level 0 do not let the tester reach the governed course page for proof.
5. Footer-only navigation is insufficient; user requested navigation tabs move to a sidebar.

---

## Prebuild Artifact Addenda

| Artifact | Addendum |
|---|---|
| App Description | `modules/ALP/00-app-description/addenda/20260712-w4-1-navigation-proof-addendum.md` |
| UX Workflow & Wiring Spec | `modules/ALP/01-ux-workflow-wiring/addenda/20260712-w4-1-navigation-proof-addendum.md` |
| FRS | `modules/ALP/02-frs/addenda/20260712-w4-1-navigation-proof-requirements.md` |
| Requirement Registry | `modules/ALP/REQUIREMENT_REGISTRY_ADDENDA/20260712-w4-1-navigation-proof-registry.md` |

---

## Next Authorized Implementation Slice After Prebuild Merge

After this prebuild PR is reviewed and merged, the next build PR may implement only:

1. Persistent learner sidebar or equivalent navigation shell.
2. Clear links for Dashboard, Profile, Public Level 0 landing, Gated Level 0 course, first gated unit, and Sign out.
3. Loop-breaker behaviour so learners are not trapped between dashboard and denied-state routes.
4. Static QA markers for sidebar/navigation proof routes.
5. Evidence updates showing the implementation remains W4.1 UI-proof support only.

---

## Explicit Non-Claims

This prebuild PR does not claim:

- W4.1 final closure.
- W4 closure.
- W4.2 start or closure.
- Payment readiness.
- Full app delivery.
- CODE_PASS.
- FUNCTIONAL_PASS.
- CWT_PASS.
- Deployment acceptance.
- Production readiness.

---

## Required Browser Proof After Implementation

Final W4.1 UI proof still requires screenshots or equivalent browser evidence for:

| Scenario | Required Proof |
|---|---|
| Enrolled learner allowed | Course shell and unit viewer accessible on governed `/learn/...` routes. |
| No enrolment row denied | Governed access-denied state shown without gated content exposure. |
| Pending denied | Governed access-denied state shown without gated content exposure. |
| Revoked denied | Governed access-denied state shown without gated content exposure. |
| Unknown/error denied | Gated course content not exposed. |
| Navigation loop removed | Sidebar/navigation allows learner to exit dashboard/denied-state loop and sign out. |
