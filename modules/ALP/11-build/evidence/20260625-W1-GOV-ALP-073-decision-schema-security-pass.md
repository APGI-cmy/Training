# W1 Schema / Security Pass Evidence

## Status Header

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W1 - Auth + Profile + Files |
| Evidence Type | Schema/security pass evidence |
| Status | Filed for review |
| Date | 2026-06-25 |
| Builder | BC-ALP-CONSOLIDATED-001 |
| Repository | APGI-cmy/Training |
| Branch | alp-w1-schema-security |
| Planned PR | #73 |

---

## 1. Purpose

This artifact records the first W1 implementation slice: schema/security only.

This pass replaces W0 placeholder database artifacts with real W1 tables, profile/private-file metadata structures, storage bucket expectations, audit hooks, and RLS policies.

This pass does not implement UI login, logout/session handling, profile forms, upload actions, browser proof, deployment acceptance, or CWT closure.

---

## 2. Implemented Artifacts

| Area | Path | Status |
|---|---|---|
| Auth/profile schema | `supabase/migrations/001_alp_auth_profile.sql` | W0 placeholder replaced with W1 schema |
| File/audit/storage schema | `supabase/migrations/006_alp_files_certificates_notifications_audit.sql` | Created W1 profile/file/audit subset |
| RLS policies | `supabase/migrations/007_alp_rls_policies.sql` | W0 placeholder replaced with W1 RLS policies |
| Progress tracker | `modules/ALP/BUILD_PROGRESS_TRACKER.md` | Updated for W1 schema/security pass |
| Evidence index | `modules/ALP/11-build/evidence/index.md` | Updated with this evidence row |

---

## 3. Schema Coverage

| W1 Requirement | Evidence |
|---|---|
| `learners` base table | `public.learners` created with status/timestamps and `auth.users` ownership |
| `user_roles` base table | `public.user_roles` created with learner/admin/reviewer/course_publisher role check |
| `profiles` base table | `public.profiles` created with certificate-critical fields and profile lock guard |
| `file_metadata` base table | `public.file_metadata` created for private profile/file ownership and object paths |
| Private file bucket expectation | `storage.buckets` upsert for `alp-private-files` with `public = false` |
| Audit hooks | `public.audit_events`, profile audit trigger, and file metadata audit trigger |

---

## 4. RLS / Privacy Coverage

| Control | Evidence |
|---|---|
| RLS enabled | `learners`, `user_roles`, `profiles`, `file_metadata`, and `audit_events` enable RLS |
| Role helper | `current_user_has_role()` and `current_user_has_any_role()` added |
| Learner isolation | Learner/profile/file policies use `auth.uid()` ownership checks |
| Staff access boundary | admin/reviewer read access is explicit where needed |
| Private storage isolation | `storage.objects` policies restrict `alp-private-files` object access by owner path or staff role |
| Cross-learner denial basis | profile/file select/update policies deny unrelated authenticated users by default |

---

## 5. Verification Status

| Check | Status | Notes |
|---|---|---|
| Local migration execution | Not run by connector | No local Supabase execution claim made. |
| Local tests | Not run by connector | No CODE_PASS or FUNCTIONAL_PASS claim made. |
| Vercel/GitHub checks | Pending PR checks | To be reviewed on PR #73 after creation. |
| Browser login proof | Not included | Reserved for W1 app/auth pass. |
| Profile save proof | Not included | Reserved for W1 app/auth pass. |
| File upload/private access proof | Not included | Reserved for W1 app/auth pass. |

---

## 6. Explicit Non-Claims

```text
FULL APP DELIVERY: NOT CLAIMED.
CODE_PASS: NOT CLAIMED.
FUNCTIONAL_PASS: NOT CLAIMED.
CWT_PASS: NOT CLAIMED.
Deployment acceptance: NOT CLAIMED.
Production readiness: NOT CLAIMED.
W1 closure: NOT CLAIMED.
```

---

## 7. Required Next Action

Review PR #73 for the W1 schema/security pass. If accepted, continue W1 with the app/auth pass: login/logout/session handling, protected layouts, profile form, and upload actions.
