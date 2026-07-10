# W4.1 UI Browser Proof Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | UI/browser proof for enrolment access gating |
| Date | 2026-07-10 |
| Status | Partial UI reconnaissance captured; W4.1 proof still blocked pending sign-out/test-state controls |
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
| Enrolled learner allowed | A learner with `course_enrolments.status = enrolled` can access the governed course shell and unit viewer. | Partially evidenced by user screenshots showing course landing/profile flow; actual gated unit access still pending. |
| Not enrolled denied | A learner with no enrolment row receives the governed access-denied state and does not see gated course content. | Blocked by missing sign-out/session reset and missing controlled non-enrolled test learner proof. |
| Pending status denied | A learner with `course_enrolments.status = pending` receives the governed access-denied state and does not see gated course content. | Blocked pending controlled test learner/status setup. |
| Revoked status denied | A learner with `course_enrolments.status = revoked` receives the governed access-denied state and does not see gated course content. | Blocked pending controlled test learner/status setup. |
| Unknown/error denied | An unresolved enrolment access decision does not expose gated course content. | Blocked pending controlled/browser capture. |

---

## Observed User UI Reconnaissance

User supplied screenshots in the ChatGPT review thread showing the following observations:

| Observation | Result | Closure Treatment |
|---|---|---|
| Course landing page | `https://training-platform-kappa.vercel.app/courses/vpshr-level-0` renders the `VPSHR Level 0` public/course landing page with progress card and `Start course` action. | Supporting UI evidence only; does not by itself prove enrolled gated unit access. |
| APGI public website | `https://apgi-public-website.vercel.app` renders the APGI public landing page. | Supporting funnel evidence only. |
| APGI public training page | `https://apgi-public-website.vercel.app/training` renders available public e-learning offerings and training links. | Supporting funnel evidence only. |
| Sign-in page | `https://training-platform-kappa.vercel.app/alp-sign-in` renders the APGI sign-in form. | Supporting authentication flow evidence. |
| Authenticated profile/dashboard | Signed-in user reaches the profile/dashboard page and can see profile/private file areas. | Supporting authenticated-session evidence; not enough to close W4.1 gating. |

---

## Route / Environment Note

The active observed deployment and route supplied by the user are:

- App: `https://training-platform-kappa.vercel.app`
- Course landing: `/courses/vpshr-level-0`
- Sign-in: `/alp-sign-in`

Earlier evidence scaffolding referenced `https://training-urls-module.vercel.app` and `/learn/...` routes. W4.1 UI proof should use the current deployed route map or explicitly reconcile the route difference before final closure.

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
| User screenshot review | User supplied screenshots confirming public course landing, public website training funnel, sign-in page, and authenticated profile/dashboard access. |
| Authenticated negative-path testing | Blocked because the user cannot currently sign out or reliably reset the learner session. |

---

## Capture Blockers Identified

| Blocker | Impact | Recommended Treatment |
|---|---|---|
| No visible sign-out facility | User cannot reliably test not-enrolled, pending, revoked, or unknown/error access states. | Add a governed sign-out facility before final W4.1 UI proof. |
| Dashboard link is small and positioned at the bottom of sign-in/profile flow | Navigation is not user-friendly and may confuse test/reviewer flow. | Improve navigation visibility as a W4.1 UI-proof enabler. |
| No controlled admin/manual enrolment path yet | Pending/revoked test states cannot be created through the UI. | Use controlled Supabase test-state setup for W4.1 proof, or implement W4.2 later for admin/manual enrolment. |
| Route mismatch between scaffold and observed deployment | Prior evidence references `/learn/...`; observed deployment uses `/courses/vpshr-level-0`. | Reconcile route map in the next proof/fix PR. |

---

## Required User/Reviewer Capture Pack Still Outstanding

Provide screenshots or equivalent browser evidence for the following states after sign-out/session control and test-state setup are available:

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

## Recommended Next Build Action

Open a small W4.1 UI-proof enabler PR to add a visible sign-out facility and improve the dashboard/navigation path. After that is merged/deployed, run controlled W4.1 UI proof for enrolled, not-enrolled, pending, revoked, and unknown/error states.

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
