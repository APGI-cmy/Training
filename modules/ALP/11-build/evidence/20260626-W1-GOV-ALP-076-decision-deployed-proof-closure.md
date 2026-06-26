# W1 Deployed Proof Record

## Status

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W1 - Auth + Profile + Files |
| Date | 2026-06-26 |
| Status | Filed for review - W1 deployed proof confirmed |
| Branch | alp-w1-deployed-proof-closure |
| PR | #76 |

---

## Merged Inputs

| Input | PR | Merge Commit |
|---|---:|---|
| W1 schema/security | #73 | `f87cd253b266fc6dc7725693dcfdf55762afe472` |
| W1 app/auth/profile/files | #74 | `d2ab509d64d78ec31f8c4652d3a94e63a6da1e8d` |
| W1 proof gate | #75 | `f69f82fe58b47c821be73648cfbd34240dc3b629` |

---

## Proof Checklist

| Proof Item | Status |
|---|---|
| Public course route | Confirmed by reviewer screenshot |
| Login at `/alp-sign-in` | Confirmed by reviewer screenshot |
| Supabase auth user exists | Confirmed by reviewer screenshot |
| Anonymous `/profile` redirect to sign-in | Confirmed by reviewer screenshot |
| Authenticated `/profile` route | Confirmed by reviewer screenshot |
| Profile save to `profiles` | Confirmed by reviewer screenshot |
| Private file upload | Confirmed by reviewer screenshot |
| Uploaded file list renders | Confirmed by reviewer screenshot |
| Learner/admin route separation | Limited proof: `/admin` did not expose admin content |
| Cross-user RLS separation | Confirmed by reviewer screenshot |

---

## Current Evidence Notes

The reviewer confirmed that anonymous `/profile` access redirects to `/alp-sign-in`. After sign-in, the reviewer reached `/profile` with saved profile and uploaded file evidence visible.

The reviewer confirmed that profile save returned `Profile saved.` and private file upload returned `Private profile file uploaded.` Two uploaded files are visible in the deployed profile screen.

The reviewer created and signed in with a second user. The second user reached `/profile` and did not see the first user's saved profile details or uploaded private files. This confirms practical cross-user separation through the deployed UI.

The `/admin` path did not expose admin content, but the route currently appears to fall through to the learning not-found screen. This is recorded as limited role-boundary proof, not a full admin-role guard pass.

---

## Decision

```text
W1 Deployed Proof: Confirmed for review.
W1 Closure: Ready for closure PR after PR #76 review/merge.
W2 Start: Not claimed by this artifact.
```

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
