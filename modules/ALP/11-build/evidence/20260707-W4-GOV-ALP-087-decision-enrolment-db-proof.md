# W4.1 Live Enrolment Access DB Proof Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | Live Supabase migration proof |
| Date | 2026-07-07 |
| Status | Filed for proof review |
| Branch | `alp-w4-1-live-db-proof` |
| Planned PR | W4.1 live DB proof PR |
| Repository | APGI-cmy/Training |
| Supabase Project | `apgi-learning-portal` / `ooujszdvncwijbuzpjfp` |

---

## Decision

This evidence records that migration `005_alp_enrolments_access` was applied to the linked `apgi-learning-portal` Supabase project after PR #86 merged.

The proof posture is deliberately narrow:

- Direct tool verification confirmed only that the two W4.1 tables exist in the live `public` schema.
- Deeper RLS/policy/catalog verification could not be completed through the Supabase connector because the metadata SQL checks were blocked by the tool safety layer.
- RLS/policy verification must therefore be completed either through Supabase UI confirmation or manually run SQL before W4.1 can be closed as fully accepted.

---

## Migration Application Record

| Item | Evidence |
|---|---|
| GitHub implementation PR | PR #86 merged on 2026-07-07. |
| Merge commit | `28d6b23a79abc9835c4193b603d69e783a9fa0d4` |
| Supabase project | `apgi-learning-portal` / `ooujszdvncwijbuzpjfp` |
| Migration applied | `005_alp_enrolments_access` |
| Apply method | Supabase connector `apply_migration` |
| Apply result | Supabase returned `success: true` |

---

## Directly Verified Through Tool

The following SQL was run through the Supabase connector after the migration was applied:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('course_enrolments', 'course_enrolment_events')
order by table_name;
```

The returned result confirmed both W4.1 tables exist:

```text
course_enrolment_events
course_enrolments
```

---

## Not Directly Verified Through Tool

The following deeper checks were attempted but blocked by the tool safety layer and were not completed through the connector:

| Verification Item | Status |
|---|---|
| RLS enabled flag on `course_enrolments` | Not directly verified through tool. |
| RLS enabled flag on `course_enrolment_events` | Not directly verified through tool. |
| Policy list for `course_enrolments` | Not directly verified through tool. |
| Policy list for `course_enrolment_events` | Not directly verified through tool. |
| Tracked migration list after application | Not directly verified through tool after application. |
| Row-count / table-read smoke test | Not directly verified through tool. |

---

## Expected W4.1 Schema Posture From Merged Migration

Based on the merged migration file in `main`, W4.1 is expected to provide:

| Item | Expected Posture |
|---|---|
| `public.course_enrolments` | Exists. Directly verified. |
| `public.course_enrolment_events` | Exists. Directly verified. |
| RLS | Expected enabled on both tables; manual/UI confirmation still required. |
| Select policies | Expected learner/admin/reviewer read visibility; manual/UI confirmation still required. |
| Insert/update policies | No public insert/update policies expected in W4.1; manual/UI confirmation still required. |
| Write management | Deferred to W4.2 manual/admin enrolment. |

---

## Manual Verification SQL

Run the following manually in Supabase SQL editor if connector verification remains blocked.

### RLS status

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('course_enrolments', 'course_enrolment_events')
order by tablename;
```

Expected result: both rows return `rowsecurity = true`.

### Policy list

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('course_enrolments', 'course_enrolment_events')
order by tablename, policyname;
```

Expected result: select policies exist for both tables. No public insert/update policies should exist in W4.1.

### Table existence

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('course_enrolments', 'course_enrolment_events')
order by table_name;
```

Expected result:

```text
course_enrolment_events
course_enrolments
```

---

## Closure Posture

This evidence does not close W4.1 as fully accepted.

W4.1 can be closed only after one of the following is captured:

1. Supabase UI screenshots confirming RLS and policy posture; or
2. manually run SQL results confirming RLS and policy posture; or
3. successful connector SQL verification if the tool-blocking issue is later resolved.

---

## Carry-Forward Controls

| Control ID | Status | W4.1 Proof Treatment |
|---|---|---|
| ALP-CTRL-003 | Open | Full app workflows remain incomplete until W4-W9 closure. |
| ALP-CTRL-004 | Open | CODE_PASS remains not claimed. |
| ALP-CTRL-005 | Open | FUNCTIONAL_PASS remains not claimed. |
| ALP-CTRL-006 | Open | CWT_PASS remains not claimed. |
| ALP-CTRL-010 | Open | Legacy iSpring embedded video playback remains open and carried forward. |
| ALP-CTRL-011 | Closed by PR #83 | No regression claim; W3 progress source of truth unchanged. |

---

## Non-Claims

This W4.1 live DB proof PR does not claim:

- W4.1 full closure.
- Full app delivery.
- CODE_PASS.
- FUNCTIONAL_PASS.
- CWT_PASS.
- Deployment acceptance.
- Production readiness.
- Live payment readiness.
- Payment gateway compliance.
- W4 closure.
- W4 payment implementation closure.

---

## Next Required Action

Complete manual/UI RLS and policy verification, then file the W4.1 closure proof.
