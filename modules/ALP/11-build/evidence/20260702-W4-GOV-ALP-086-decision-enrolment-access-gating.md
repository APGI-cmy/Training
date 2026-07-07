# W4.1 Enrolment State and Course Access Gating Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W4.1 - Enrolment state and course access gating |
| Evidence Type | Implementation slice evidence |
| Date | 2026-07-02 |
| Status | Filed for implementation review |
| Branch | `alp-w4-1-enrolment-access-gating` |
| Planned PR | W4.1 implementation PR |
| Repository | APGI-cmy/Training |

---

## Decision

W4.1 implements the first W4 build slice: database-backed learner-course enrolment state and route-level course access gating.

This slice gates the learner course shell and unit viewer before progress data or course unit content is loaded. It creates the foundation needed before any payment gateway, payment lifecycle, or live payment readiness work.

---

## Implementation Summary

| Area | Implementation |
|---|---|
| Database schema | Adds `public.course_enrolments` and `public.course_enrolment_events`. |
| Enrolment statuses | Supports `pending`, `enrolled`, and `revoked`; missing row is handled in application logic as `not_enrolled`. |
| RLS | Enables RLS for enrolment and enrolment-event tables. |
| Access service | Adds `getCourseAccess` to resolve learner-course access from Supabase REST. |
| Course shell gate | Blocks `/learn/[courseSlug]` unless access decision allows the learner to view the course shell. |
| Unit viewer gate | Blocks `/learn/[courseSlug]/units/[unitSlug]` unless access decision allows the learner to view unit content. |
| Denied-state UI | Adds `CourseAccessDenied` for governed negative-path proof. |
| Static QA | Adds W4.1 QA coverage for schema, RLS, service, and route gating. |

---

## Acceptance Evidence

| Gate | Evidence |
|---|---|
| Enrolment source of truth exists | `supabase/migrations/005_alp_enrolments_access.sql` creates `course_enrolments`. |
| Enrolment audit trail exists | `supabase/migrations/005_alp_enrolments_access.sql` creates `course_enrolment_events`. |
| Learner course access has explicit statuses | Migration check constraint permits `pending`, `enrolled`, and `revoked`; missing row is treated as `not_enrolled`. |
| Route access gate exists | Course shell and unit viewer call `getCourseAccess` before loading gated course content. |
| Negative path exists | `CourseAccessDenied` renders the status and reason when access is not allowed. |
| Payment readiness not claimed | This PR adds no payment provider, payment code, live payment flow, or payment compliance claim. |

---

## Golden Path

An authenticated learner with a `course_enrolments` row in status `enrolled` can access:

- `/learn/[courseSlug]`
- `/learn/[courseSlug]/units/[unitSlug]`

The learner can then continue the existing W3 progress/completion flow.

---

## Negative Paths

A learner must not access gated course content when:

- no enrolment row exists;
- enrolment status is `pending`;
- enrolment status is `revoked`;
- Supabase enrolment access cannot be resolved.

In these cases the learner receives the governed access-denied state instead of the course shell or unit viewer.

---

## Carry-Forward Controls

| Control ID | Status | W4.1 Treatment |
|---|---|---|
| ALP-CTRL-003 | Open | Full app workflows remain incomplete until W4-W9 closure. |
| ALP-CTRL-004 | Open | CODE_PASS remains not claimed. |
| ALP-CTRL-005 | Open | FUNCTIONAL_PASS remains not claimed. |
| ALP-CTRL-006 | Open | CWT_PASS remains not claimed. |
| ALP-CTRL-010 | Open | Legacy iSpring embedded video playback remains open and carried forward. |
| ALP-CTRL-011 | Closed by PR #83 | No W4.1 regression expected; W3 progress source of truth remains unchanged. |

---

## Non-Claims

This W4.1 slice does not claim:

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

After review and merge, apply/verify migration `005_alp_enrolments_access.sql` in Supabase and capture live DB proof before closing W4.1 as fully accepted.

Recommended next build slice after DB proof: W4.2 Manual/admin enrolment path and audit trail management.
