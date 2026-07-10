# W4.1 UI Proof Gate Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | UI/browser proof gate |
| Date | 2026-07-10 |
| Status | W4.1 closure held pending UI/browser proof |
| Branch | `alp-w4-1-final-closure` |
| Repository | APGI-cmy/Training |
| Closure Source Already Accepted | PR #86 implementation merge and PR #88 DB proof closure merge |

---

## Decision

W4.1 must remain open until UI/browser proof is filed.

PR #86 merged the W4.1 access-gating implementation and PR #88 merged the W4.1 live DB proof closure. However, the W4 entry governance requires database-backed proof plus UI proof before W4.1 closure can be accepted.

Because no browser proof is currently filed for the golden and negative access paths, W4.1 is not closed by this evidence.

---

## Accepted Evidence Already Available

| Evidence Item | Accepted Result |
|---|---|
| W4.1 implementation PR | PR #86 merged. |
| W4.1 implementation merge commit | `28d6b23a79abc9835c4193b603d69e783a9fa0d4` |
| W4.1 partial live DB proof PR | PR #87 merged. |
| W4.1 partial DB proof merge commit | `cf307dd31aa4086b1248481cc968e7459fc8ae23` |
| W4.1 DB proof closure PR | PR #88 merged. |
| W4.1 DB proof closure merge commit | `06d80000f35cfe90ffbc1fec3cb07f312cee1cd7` |
| Enrolment table | `public.course_enrolments` verified. |
| Enrolment event table | `public.course_enrolment_events` verified. |
| Row-count smoke reads | Verified for both W4.1 enrolment tables. |
| RLS | Verified enabled on both W4.1 enrolment tables. |
| SELECT policies | Verified on both W4.1 enrolment tables. |
| Non-SELECT/write policies | Verified absent on both W4.1 enrolment tables. |
| Migration history | Verified `004_alp_progress_completion` and `005_alp_enrolments_access`. |

---

## Missing UI Proof Required Before W4.1 Closure

The following browser/UI proof must be filed before W4.1 can close:

| Required Proof | Acceptance Requirement |
|---|---|
| Enrolled learner golden path | Browser proof showing an enrolled learner can access the course shell. |
| Enrolled learner unit path | Browser proof showing an enrolled learner can access a protected unit page. |
| Not-enrolled or pending learner denied path | Browser proof showing the governed `CourseAccessDenied` state renders for a learner who is not enrolled or not yet allowed. |
| Revoked learner denied path, where practical | Browser proof or explicit deferral rationale for revoked access denial. |

---

## Why Proxy Browser Proof Is Not Completed Here

The protected W4.1 routes require a signed-in ALP session before the access gate is evaluated. The route then checks enrolment status using the signed-in user's access token and user ID.

Without a usable signed-in enrolled learner session and a usable signed-in not-enrolled, pending, or revoked learner session, browser proof cannot be produced honestly from this proxy review.

---

## Closure Boundary

This evidence does not close W4.1.

The following remain not claimed:

| Area | Status |
|---|---|
| W4.1 final closure | Not claimed pending UI/browser proof. |
| W4 as a whole | Not closed. |
| W4.2 manual/admin enrolment creation | Not started. |
| Payment status lifecycle | Not started. |
| Payment gateway integration | Not started. |
| Live payment readiness | Not claimed. |
| Full app delivery | Not claimed. |
| CODE_PASS | Not claimed. |
| FUNCTIONAL_PASS | Not claimed. |
| CWT_PASS | Not claimed. |
| Deployment acceptance | Not claimed. |
| Production readiness | Not claimed. |
| Final content quality acceptance | Not claimed. |

---

## Next Required Action

File W4.1 UI/browser proof for the enrolled allowed path and denied access path. After that evidence is accepted, W4.1 may be closed for approved scope only.
