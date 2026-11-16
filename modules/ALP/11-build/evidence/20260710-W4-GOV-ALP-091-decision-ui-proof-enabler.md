# W4.1 UI Proof Enabler Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | UI-proof enabler implementation evidence |
| Date | 2026-07-10 |
| Status | Filed for implementation review |
| Branch | `alp-w4-1-ui-proof-enabler` |
| Repository | APGI-cmy/Training |
| Governance Source | PR #89 held W4.1 closure pending UI/browser proof |

---

## Decision

This PR implements the small UI-proof enabler needed before final W4.1 browser proof can be captured.

It does not close W4.1. It only removes practical proof blockers identified during user browser reconnaissance.

---

## Implementation Summary

| Area | Implementation |
|---|---|
| Sign out facility | Adds `SignOutControl` and exposes it in the global header and profile page. |
| Sign out redirect | Updates `signOutAction` to clear auth cookies and return users to `/alp-sign-in`. |
| Dashboard navigation | Adds clearer dashboard/profile/gated-course navigation in the header, footer, and profile masthead. |
| Route clarification | Clarifies that `/courses/vpshr-level-0` is the public course landing page and `/learn/vpshr-level-0` is the governed learner route for W4.1 proof. |
| Unit routes | Updates unit cards to point at governed `/learn/vpshr-level-0/units/[unitSlug]` routes. |
| Static QA | Adds QA markers for sign-out and governed route clarification. |

---

## W4.1 UI Proof Enabled

After deployment, reviewers should be able to:

1. Sign in as a learner.
2. Use the visible sign-out button to reset the browser session.
3. Navigate clearly to dashboard/profile/gated Level 0 routes.
4. Use `/learn/vpshr-level-0` and `/learn/vpshr-level-0/units/[unitSlug]` for access-gating proof.
5. Avoid confusing the public `/courses/...` landing page with the governed `/learn/...` access-gated routes.

---

## Remaining W4.1 Proof Required After Merge

This enabler PR still does not prove the access states. After deployment, W4.1 still requires browser/UI proof for:

| Scenario | Required Proof |
|---|---|
| Enrolled learner allowed | Course shell and unit viewer accessible on governed `/learn/...` routes. |
| No enrolment row denied | Governed access-denied state shown. |
| Pending denied | Governed access-denied state shown. |
| Revoked denied | Governed access-denied state shown. |
| Unknown/error denied | Gated course content not exposed. |

---

## Non-Claims

Full app delivery: NOT CLAIMED.  
CODE_PASS: NOT CLAIMED.  
FUNCTIONAL_PASS: NOT CLAIMED.  
CWT_PASS: NOT CLAIMED.  
Deployment acceptance: NOT CLAIMED.  
Production readiness: NOT CLAIMED.  
Live payment readiness: NOT CLAIMED.  
W4 closure: NOT CLAIMED.  
W4.1 final closure: NOT CLAIMED.  
W4.2 start or closure: NOT CLAIMED.
