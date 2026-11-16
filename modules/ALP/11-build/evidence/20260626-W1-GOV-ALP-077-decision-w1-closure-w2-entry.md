# W1 Closure / W2 Entry Evidence

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W1 - Auth + Profile + Files |
| Evidence Type | Closure decision and W2 entry authorization |
| Date | 2026-06-26 |
| Status | Filed for review |
| Branch | alp-w1-closure-w2-entry |
| Planned PR | #77 |

---

## Merged Inputs

| Input | PR | Merge Commit | Status |
|---|---:|---|---|
| W1 schema/security | #73 | `f87cd253b266fc6dc7725693dcfdf55762afe472` | Merged |
| W1 app/auth/profile/files | #74 | `d2ab509d64d78ec31f8c4652d3a94e63a6da1e8d` | Merged |
| W1 proof gate | #75 | `f69f82fe58b47c821be73648cfbd34240dc3b629` | Merged |
| W1 deployed proof | #76 | `0c08771d71a9a59028c50666238f5db8877ada81` | Merged |

---

## W1 Proof Accepted for Closure

| Proof Item | Closure Status |
|---|---|
| Public course route | Accepted |
| Login at `/alp-sign-in` | Accepted |
| Supabase auth user exists | Accepted |
| Anonymous `/profile` redirect to sign-in | Accepted |
| Authenticated `/profile` route | Accepted |
| Profile save to `profiles` | Accepted |
| Private file upload | Accepted |
| Uploaded file list renders | Accepted |
| Cross-user RLS separation | Accepted |
| Learner/admin route separation | Accepted with limitation: `/admin` did not expose admin content; full admin-console proof deferred to future admin wave |

---

## Closure Decision

```text
W1 Auth + Profile + Files: PROPOSED CLOSED FOR W1 SCOPE (effective upon PR #77 merge).
```

W1 is closed only for the approved W1 scope: auth route, protected profile route, profile save, private file upload, storage metadata, protected-route behavior, and practical cross-user separation.

---

## W2 Entry Authorization

```text
W2 Dashboard + Course Shell + Unit Viewer: AUTHORIZED FOR ENTRY (effective after PR #77 merge).
```

W2 may now start as the next implementation wave. This artifact authorizes W2 entry only. It does not implement W2.

---

## W1 Known Limitations / Follow-Up Controls

| Item | Status |
|---|---|
| `/admin` route | Does not expose admin content, but full admin console proof is deferred. |
| `/login` alias | Not present; W1 uses `/alp-sign-in`. |
| Logout UI | Not exposed in W1. |
| Full app workflows | Still incomplete and reserved for later waves. |

---

## Non-Claims

```text
Full app delivery: Not claimed.
CODE_PASS: Not claimed.
FUNCTIONAL_PASS: Not claimed.
CWT_PASS: Not claimed.
Deployment acceptance: Not claimed.
Production readiness: Not claimed.
```
