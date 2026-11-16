# W4.1 Closure Hold Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | W4.1 closure hold / UI proof blocker |
| Date | 2026-07-10 |
| Status | Closure held pending UI/browser proof |
| Branch | `alp-w4-1-final-closure` |
| Repository | APGI-cmy/Training |
| Closure Source | PR #86 implementation merge and PR #88 DB proof closure merge |

---

## Decision

W4.1 is not yet closed for final approved scope.

PR #88 closed the live database-proof gap for W4.1. However, W4.1 was originally authorized with a closure requirement of database-backed proof plus UI proof. The current evidence chain proves the database foundation, route-gating implementation, static QA, and live Supabase controls, but it does not yet include browser/UI proof for the access-gating behaviour.

This evidence therefore holds W4.1 open pending UI/browser proof.

---

## Accepted Evidence to Date

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

## W4.1 Evidence Accepted as Complete

The following W4.1 evidence is accepted as complete:

1. Enrolment state schema foundation.
2. Enrolment event/audit table foundation.
3. Course-shell access gate implementation.
4. Unit-viewer access gate implementation.
5. Governed access-denied component implementation.
6. Static QA coverage for W4.1 access gating.
7. Live Supabase database proof for the W4.1 enrolment access foundation.

---

## Remaining Required UI Proof

W4.1 final closure still requires browser/UI evidence showing:

| UI Proof Item | Required Evidence |
|---|---|
| Enrolled learner allowed | Browser proof that a learner with `course_enrolments.status = enrolled` can access the course shell and unit viewer. |
| Not enrolled denied | Browser proof that a learner with no enrolment row receives the governed access-denied state. |
| Pending denied | Browser proof that a learner with `course_enrolments.status = pending` receives the governed access-denied state. |
| Revoked denied | Browser proof that a learner with `course_enrolments.status = revoked` receives the governed access-denied state. |
| Error/unknown denied | Browser proof or controlled evidence that unresolved enrolment access does not expose gated course content. |

---

## Explicit Non-Closure Boundaries

This W4.1 hold does not close or claim:

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

## Carry-Forward Controls

| Control ID | Status | Closure Treatment |
|---|---|---|
| ALP-CTRL-003 | Open | Full app workflows remain incomplete until W4-W9 closure. |
| ALP-CTRL-004 | Open | CODE_PASS remains not claimed. |
| ALP-CTRL-005 | Open | FUNCTIONAL_PASS remains not claimed. |
| ALP-CTRL-006 | Open | CWT_PASS remains not claimed. |
| ALP-CTRL-010 | Open | Legacy iSpring embedded video playback remains open and carried forward. |
| ALP-CTRL-011 | Closed by PR #83 | W3 progress source of truth remains unchanged. |

---

## Next Required Action

Capture W4.1 browser/UI proof for enrolled access and denied-state behaviour. File final W4.1 closure only after that proof is accepted.
