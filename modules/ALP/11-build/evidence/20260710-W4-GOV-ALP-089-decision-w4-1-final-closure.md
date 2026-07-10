# W4.1 Final Closure Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | Final W4.1 closure normalization |
| Date | 2026-07-10 |
| Status | Closed for approved W4.1 scope |
| Branch | `alp-w4-1-final-closure` |
| Repository | APGI-cmy/Training |
| Closure Source | PR #86 implementation merge and PR #88 DB proof closure merge |

---

## Decision

W4.1 is closed for its approved scope only.

The approved W4.1 scope was limited to enrolment state and course access gating. It included the database-backed enrolment/access foundation, route-level access gating, denied-state rendering, static QA coverage, and live Supabase DB proof.

This evidence records the final post-merge closure posture after PR #88 merged.

---

## Accepted Closure Evidence

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

## W4.1 Closed Scope

The following are accepted as closed for W4.1:

1. Enrolment state schema foundation.
2. Enrolment event/audit table foundation.
3. Course-shell access gating.
4. Unit-viewer access gating.
5. Governed access-denied rendering.
6. Static QA coverage for W4.1 access gating.
7. Live Supabase database proof for the W4.1 enrolment access foundation.

---

## Explicit Non-Closure Boundaries

This W4.1 closure does not close or claim:

| Area | Status |
|---|---|
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

## Next Authorized Build Slice

Recommended next build slice: W4.2 manual/admin enrolment creation and audit-trail management.
