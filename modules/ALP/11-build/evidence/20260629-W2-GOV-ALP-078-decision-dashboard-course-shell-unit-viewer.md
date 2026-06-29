# W2 Dashboard / Course Shell / Unit Viewer Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W2 - Dashboard + Course Shell + Unit Viewer |
| Evidence Type | Implementation slice evidence |
| Date | 2026-06-29 |
| Status | Filed for review |
| Branch | alp-w2-dashboard-course-shell-entry |
| Planned PR | #78 |

---

## Entry Basis

W2 entry is authorized because PR #77 closed W1 for the approved Auth + Profile + Files scope.

---

## Implemented in this Slice

| Area | Status |
|---|---|
| Learner dashboard route `/dashboard` | Added |
| Dashboard service | Added |
| Learner course shell route `/learn/vpshr-level-0` | Added |
| Unit viewer route `/learn/vpshr-level-0/units/[unitSlug]` | Added |
| Course shell service | Added |
| Unit content service | Added |
| Course shell/sidebar components | Added |
| Unit viewer component with iframe/fallback links | Added |
| Navigation link to dashboard | Added |
| W2 course metadata schema migration | Added |
| VPSHR Level 0 read-only seed metadata | Added |

---

## Known Limits

| Item | Status |
|---|---|
| Generic dynamic `/learn/[courseSlug]` route | Deferred; connector blocked the dynamic route write, so this first slice uses the concrete VPSHR route. |
| Progress persistence | Placeholder only; W3 owns progress/completion. |
| Manual browser proof | Pending after merge/deploy. |
| Functional pass | Not claimed. |

---

## Required Review / Proof

After merge/deploy, reviewer should confirm:

1. `/dashboard` requires authentication and renders assigned course cards.
2. `/learn/vpshr-level-0` renders the W2 course shell and sidebar.
3. `/learn/vpshr-level-0/units/introduction` renders the W2 unit viewer.
4. The embedded unit appears or the fallback link opens the original unit.
5. Existing legacy routes under `/courses/vpshr-level-0` still render.

---

## Non-Claims

```text
W2 closure: NOT CLAIMED.
Full app delivery: NOT CLAIMED.
CODE_PASS: NOT CLAIMED.
FUNCTIONAL_PASS: NOT CLAIMED.
CWT_PASS: NOT CLAIMED.
Deployment acceptance: NOT CLAIMED.
Production readiness: NOT CLAIMED.
```
