# W4.1 Enrolment DB Proof Closure Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | Live Supabase DB proof closure |
| Date | 2026-07-07 |
| Status | Filed for closure review |
| Branch | `alp-w4-1-db-proof-closure` |
| Current PR | W4.1 DB proof closure PR |
| Repository | APGI-cmy/Training |
| Supabase Project | `apgi-learning-portal` / `ooujszdvncwijbuzpjfp` |

---

## Decision

This evidence closes the W4.1 database-proof gap that remained after GOV-ALP-087.

After PR #87 merged, the Supabase connector was validated through non-destructive read-only checks against the linked `apgi-learning-portal` project. The checks confirmed the missing DB-control evidence for the W4.1 enrolment access migration.

This closure is limited to W4.1 database proof for enrolment access gating. It does not close W4 as a whole and does not authorize payment readiness.

---

## Verified Live Supabase Evidence

| Verification Item | Result |
|---|---|
| Project access | Connector accessed `apgi-learning-portal` / `ooujszdvncwijbuzpjfp`. |
| Public schema table list | Connector listed public tables and included both W4.1 enrolment tables. |
| `public.course_enrolments` table | Exists. |
| `public.course_enrolment_events` table | Exists. |
| `public.course_enrolments` row-count smoke read | Read succeeded; row count returned `0`. |
| `public.course_enrolment_events` row-count smoke read | Read succeeded; row count returned `0`. |
| RLS on `public.course_enrolments` | Verified `rowsecurity = true`. |
| RLS on `public.course_enrolment_events` | Verified `rowsecurity = true`. |
| Policy on `public.course_enrolments` | Verified `course_enrolments_select_self_or_admin`, command `SELECT`. |
| Policy on `public.course_enrolment_events` | Verified `course_enrolment_events_select_self_or_admin`, command `SELECT`. |
| Write policy check | Verified no non-SELECT policies exist on either W4.1 enrolment table. |
| Migration history | Verified migrations include `004_alp_progress_completion` and `005_alp_enrolments_access`. |

---

## W4.1 DB Proof Closure Scope

The following W4.1 DB proof items are now accepted for the W4.1 enrolment access-gating foundation:

1. Migration `005_alp_enrolments_access` is applied.
2. The two W4.1 enrolment tables exist.
3. Table reads succeed through the connector.
4. RLS is enabled on both tables.
5. Each table has the expected SELECT policy.
6. No non-SELECT write policies exist on either W4.1 enrolment table.
7. Enrolment write management remains intentionally deferred to W4.2.

---

## Remaining Out of Scope

The following remain out of scope and are not closed by this evidence:

| Area | Status |
|---|---|
| W4.2 manual/admin enrolment creation | Not started. |
| Payment status lifecycle | Not started. |
| Payment gateway integration | Not started. |
| Live payment readiness | Not claimed. |
| Full W4 closure | Not claimed. |
| Full app delivery | Not claimed. |
| CODE_PASS | Not claimed. |
| FUNCTIONAL_PASS | Not claimed. |
| CWT_PASS | Not claimed. |
| Deployment acceptance | Not claimed. |
| Production readiness | Not claimed. |

---

## Carry-Forward Controls

| Control ID | Status | W4.1 Closure Treatment |
|---|---|---|
| ALP-CTRL-003 | Open | Full app workflows remain incomplete until W4-W9 closure. |
| ALP-CTRL-004 | Open | CODE_PASS remains not claimed. |
| ALP-CTRL-005 | Open | FUNCTIONAL_PASS remains not claimed. |
| ALP-CTRL-006 | Open | CWT_PASS remains not claimed. |
| ALP-CTRL-010 | Open | Legacy iSpring embedded video playback remains open and carried forward. |
| ALP-CTRL-011 | Closed by PR #83 | No regression claim; W3 progress source of truth unchanged. |

---

## Closure Recommendation

Close W4.1 DB-proof gap for the verified database-proof scope only.

Recommended next build slice: W4.2 manual/admin enrolment creation and audit-trail management.
