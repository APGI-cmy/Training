# W4.1 UI Browser Proof Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | UI/browser proof for enrolment access gating |
| Date | 2026-07-10 |
| Status | Capture blocked pending authenticated browser session / screenshot evidence |
| Branch | `alp-w4-1-ui-proof` |
| Repository | APGI-cmy/Training |
| Prior DB Proof Closure | PR #88 / `06d80000f35cfe90ffbc1fec3cb07f312cee1cd7` |
| Prior Hold Record | PR #89 / `7663b5b514ec20642f43f2485f5035f16893734f` |

---

## Purpose

This evidence file is intended to capture the missing W4.1 UI/browser proof required before W4.1 can be finally closed.

PR #88 closed the live DB proof for W4.1. PR #89 correctly held W4.1 open because browser/UI proof had not yet been filed.

---

## Required UI Proof Matrix

| Scenario | Required Browser/UI Evidence | Capture Status |
|---|---|---|
| Enrolled learner allowed | A learner with `course_enrolments.status = enrolled` can access `/learn/[courseSlug]` and `/learn/[courseSlug]/units/[unitSlug]`. | Pending authenticated browser capture |
| Not enrolled denied | A learner with no enrolment row receives the governed access-denied state and does not see gated course content. | Pending authenticated browser capture |
| Pending status denied | A learner with `course_enrolments.status = pending` receives the governed access-denied state and does not see gated course content. | Pending authenticated browser capture |
| Revoked status denied | A learner with `course_enrolments.status = revoked` receives the governed access-denied state and does not see gated course content. | Pending authenticated browser capture |
| Unknown/error denied | An unresolved enrolment access decision does not expose gated course content. | Pending controlled/browser capture |

---

## Initial Test Targets

| Item | Value |
|---|---|
| Production app URL | `https://training-urls-module.vercel.app` |
| Course shell route | `/learn/vpshr-level-0` |
| Unit viewer route | `/learn/vpshr-level-0/units/introduction` |
| Test learner | Pending confirmed browser session / test account |
| Supabase project | `apgi-learning-portal` / `ooujszdvncwijbuzpjfp` |

---

## Capture Attempt Log

| Attempt | Result |
|---|---|
| Evidence branch created | `alp-w4-1-ui-proof` created from `main`. |
| Evidence scaffold added | GOV-ALP-090 added to capture W4.1 UI/browser proof. |
| Vercel fetch attempt - course shell | `https://training-urls-module.vercel.app/learn/vpshr-level-0` could not be fetched through the Vercel connector; no browser proof captured. |
| Vercel fetch attempt - unit viewer | `https://training-urls-module.vercel.app/learn/vpshr-level-0/units/introduction` could not be fetched through the Vercel connector; no browser proof captured. |
| Vercel share-link attempt - course shell | Share-link creation failed for `/learn/vpshr-level-0`; no browser proof captured. |
| Vercel share-link attempt - unit viewer | Share-link creation failed for `/learn/vpshr-level-0/units/introduction`; no browser proof captured. |
| Authenticated learner session | Not available to the assistant; user/reviewer browser capture required. |

---

## Capture Blocker

The assistant cannot currently capture true W4.1 browser proof because the available connector access did not return the deployed learner routes and no authenticated learner browser session/test-account cookies are available in this environment.

Because W4.1 requires browser/UI proof, this file must remain a capture scaffold and blocker record until screenshots or equivalent browser evidence are provided by a user/reviewer with access to the deployed app and a controlled test learner account.

---

## Required User/Reviewer Capture Pack

Provide screenshots or equivalent browser evidence for the following states:

1. `enrolled` - course shell accessible.
2. `enrolled` - unit viewer accessible.
3. no enrolment row - access-denied state shown.
4. `pending` - access-denied state shown.
5. `revoked` - access-denied state shown.
6. unknown/error state - gated content not exposed.

Each screenshot should include the browser URL and enough page content to confirm the result.

---

## Governance Boundary

This file does not yet claim W4.1 final closure.

W4.1 final closure may only be claimed after browser/UI proof is captured and accepted for the required positive and negative access states.

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
W4.1 final closure: NOT CLAIMED until UI/browser proof is captured and accepted.
