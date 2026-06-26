# W1 Proof / Closure Gate Evidence

## Status Header

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W1 - Auth + Profile + Files |
| Evidence Type | Proof / closure gate evidence |
| Status | Filed for review |
| Date | 2026-06-26 |
| Builder | BC-ALP-CONSOLIDATED-001 |
| Repository | APGI-cmy/Training |
| Branch | alp-w1-proof-closure |
| Planned PR | #75 |

---

## 1. Purpose

This artifact records the W1 proof and closure gate after:

- PR #73 merged the W1 schema/security slice; and
- PR #74 merged the W1 app/auth/profile/files slice.

The purpose of this gate is to prevent W1 being marked closed until the required proof exists.

---

## 2. W1 Implementation Slices Now Merged

| Slice | PR | Merge Commit | Status |
|---|---:|---|---|
| W1 schema/security | #73 | `f87cd253b266fc6dc7725693dcfdf55762afe472` | Merged |
| W1 app/auth/profile/files | #74 | `d2ab509d64d78ec31f8c4652d3a94e63a6da1e8d` | Merged |

---

## 3. Proof Required by Implementation Plan

| Required Proof | Status | Notes |
|---|---|---|
| Login proof | Pending | Requires deployed route test at `/alp-sign-in` with valid learner/admin credentials. |
| Profile save proof | Pending | Requires authenticated `/profile` save and persisted `profiles` record. |
| File upload/private access proof | Pending | Requires authenticated upload into `alp-private-files` and matching `file_metadata` record. |
| RLS negative proof | Pending | Requires cross-learner profile/file access denial test. |

---

## 4. Closure Decision

```text
W1 CLOSURE: NOT CLAIMED.
```

W1 cannot be closed until the proof items in Section 3 are attached, linked, or explicitly confirmed by a reviewer with access to the deployed environment and test accounts.

---

## 5. W2 Authorization Position

W2 - Dashboard + Course Shell + Unit Viewer remains blocked until W1 is accepted/closed.

```text
W2 START: BLOCKED UNTIL W1 PROOF ACCEPTED.
```

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
W2 start authorization: NOT CLAIMED.
```

---

## 7. Reviewer Action Required

A reviewer with deployed environment access must complete the W1 browser proof path:

1. Sign in at `/alp-sign-in`.
2. Open `/profile`.
3. Save certificate-critical profile details.
4. Upload a private profile photo or CV.
5. Confirm the matching `file_metadata` record.
6. Confirm another learner cannot access the first learner's profile or private file metadata.

After this evidence is attached or confirmed, W1 may be marked closed in a follow-up closure update and W2 may begin.
