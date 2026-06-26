# W1 App Auth Profile Files Pass Evidence

## Status Header

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W1 - Auth + Profile + Files |
| Evidence Type | App/auth/profile/files pass evidence |
| Status | Filed for review |
| Date | 2026-06-26 |
| Builder | BC-ALP-CONSOLIDATED-001 |
| Repository | APGI-cmy/Training |
| Branch | alp-w1-app-auth-profile-files |
| Planned PR | #74 |

---

## 1. Purpose

This artifact records the second W1 implementation slice: app/auth/profile/files.

This pass builds on the merged W1 schema/security pass from PR #73 and adds the first protected learner-facing W1 surfaces and server actions.

---

## 2. Implemented Artifacts

| Area | Path | Status |
|---|---|---|
| Auth session helpers | `src/server/auth/session.ts` | Added token-cookie session helper, sign-in helper, session requirement, and role checks |
| Login action | `src/server/actions/auth/sign-in.ts` | Added sign-in server action |
| Profile update action | `src/server/actions/profiles/update-profile.ts` | Added profile save action |
| Private file upload action | `src/server/actions/files/upload-profile-file.ts` | Added private file upload and metadata action |
| Profile service helpers | `src/server/services/profiles.ts` | Added profile/file REST helpers |
| Login form | `src/components/auth/login-form.tsx` | Added client form for sign-in action |
| Profile form | `src/components/profile/profile-form.tsx` | Added client form for certificate-critical fields |
| File upload control | `src/components/files/file-upload-control.tsx` | Added client file upload control |
| Sign-in page | `app/alp-sign-in/page.tsx` | Added public W1 sign-in route |
| Protected profile page | `app/profile/page.tsx` | Added protected learner profile route |
| Admin route guard shell | `app/admin/layout.tsx` | Added admin protected layout |
| W1 styling | `app/globals.css` | Added form/profile panel styles |

---

## 3. W1 Coverage

| W1 Requirement | Coverage |
|---|---|
| Login/session handling | `signInWithPassword`, token cookies, `/alp-sign-in`, and `requireSession()` |
| Server-side role checks | `getUserRoles()` and `requireRole()` against `user_roles` |
| Protected learner profile route | `/profile` requires authenticated session |
| Certificate-critical profile fields | `certificate_name`, full name, preferred name, phone, and country are captured |
| Profile persistence | `updateProfileAction()` writes to `profiles` through the Supabase REST endpoint |
| Private file upload | `uploadProfileFileAction()` uploads to `alp-private-files` using a user-owned path |
| File metadata | Upload action writes to `file_metadata` after storage upload |
| Protected admin boundary | `app/admin/layout.tsx` requires admin role |

---

## 4. Known Connector Limitations

The connector blocked three low-risk write attempts during this pass:

- creating `app/login/page.tsx` directly;
- adding a global navigation update to `app/layout.tsx`;
- changing the unused logout action redirect.

The implemented public route is therefore `/alp-sign-in`. The unused logout action is not surfaced in the UI in this pass.

---

## 5. Verification Status

| Check | Status | Notes |
|---|---|---|
| Local build | Not run by connector | No local execution claim made. |
| Local typecheck | Not run by connector | No CODE_PASS claim made. |
| Local functional test | Not run by connector | No FUNCTIONAL_PASS claim made. |
| Login browser proof | Not run by connector | Requires deployed/environment test user. |
| Profile save browser proof | Not run by connector | Requires deployed/environment test user. |
| File upload/private access proof | Not run by connector | Requires deployed/environment test user and storage validation. |
| Vercel/GitHub checks | Pending PR checks | To be reviewed after PR creation. |

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

Review PR #74 checks, code, and evidence. If accepted, run the deployed W1 browser proof path with a real test learner before any W1 closure claim.
