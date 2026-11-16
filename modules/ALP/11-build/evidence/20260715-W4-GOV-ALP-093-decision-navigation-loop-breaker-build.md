# W4.1 Navigation Loop-Breaker Build Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | Navigation/sidebar loop-breaker implementation evidence |
| Date | 2026-07-15 |
| Status | Filed for build review |
| Branch | `alp-w4-1-navigation-loop-breaker` |
| Repository | APGI-cmy/Training |
| Prebuild Authority | PR #91 / GOV-ALP-092 |

---

## Decision

This build implements only the navigation/sidebar proof-enabler scope authorized by the merged W4.1 prebuild addenda in PR #91.

It does not close W4.1. Final closure remains dependent on deployed browser proof of the required enrolment access states.

---

## Implemented Scope

| Requirement | Implementation |
|---|---|
| FR-ALP-NAV-001 | Added persistent `LearnerSidebar` within the authenticated learner route-group layout. Public routes remain outside the learner shell. |
| FR-ALP-NAV-002 | Sidebar clearly labels public course information separately from governed enrolment routes. |
| FR-ALP-NAV-003 | Added dashboard, profile, public landing, governed course, governed first-unit, and sign-out exits to break the circular navigation path. |
| FR-ALP-NAV-004 | Reuses the governed visible sign-out control. |
| FR-ALP-NAV-005 | Added semantic navigation landmarks and responsive sidebar styles for narrow screens. |

---

## Implementation Files

| File | Purpose |
|---|---|
| `src/components/navigation/LearnerSidebar.tsx` | Persistent authenticated learner navigation and route labels. |
| `app/(learner)/layout.tsx` | Learner-only sidebar shell without making public routes session-aware. |
| `app/(learner)/profile/page.tsx` | Keeps `/profile` inside the learner route group without changing its URL. |
| `app/layout.tsx` | Retains the public root shell and removes footer-only learner navigation. |
| `app/navigation-shell.css` | Responsive sidebar/shell styling and shared header-height variable. |
| `src/components/course/CourseAccessDenied.tsx` | Semantic denied-state recovery routes and sign-out control. |
| `tests/qa-to-red/alp/navigation-loop-breaker.spec.ts` | QA-ALP-248 through QA-ALP-251 static build checks. |

---

## QA-to-Red / Build-to-Green Markers

| QA ID | Check |
|---|---|
| QA-ALP-248 | Persistent sidebar exposes all proof-critical routes and sign-out. |
| QA-ALP-249 | Learner route group renders the sidebar while the public root layout remains session-free. |
| QA-ALP-250 | Denied state exposes semantic recovery navigation and sign-out. |
| QA-ALP-251 | Footer-only route navigation is removed, the sidebar is responsive, and header offset uses a shared variable. |

---

## Review Corrections Included

The final branch incorporates review corrections that:

1. keep public catalogue and public course routes outside the authenticated learner shell;
2. avoid duplicate Supabase session lookups caused by a session-aware root layout;
3. use a semantic navigation landmark for denied-state recovery actions; and
4. centralize the application header offset in a CSS custom property.

---

## Required Post-Deployment Browser Proof

After this PR is merged and deployed, browser proof must confirm:

1. Signed-in learner sidebar is visible on learner pages.
2. Dashboard, Profile, Public Level 0 landing, Gated Level 0, and First gated unit links are usable.
3. Sign-out clears the session and returns to `/alp-sign-in`.
4. Public `/courses/...` and governed `/learn/...` routes are visibly distinguishable.
5. A denied learner can leave the denied state via dashboard, profile, public landing, or sign-out.
6. The prior dashboard/denied-state circular navigation is removed.
7. Enrolled, no-row, pending, revoked, and unknown/error access-state proof is still captured separately.

---

## Explicit Non-Claims

This build PR does not claim:

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
