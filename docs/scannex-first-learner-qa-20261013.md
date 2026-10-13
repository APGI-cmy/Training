# Scannex first-learner QA — 13 October 2026

Scope: administrator-issued course invitations and manual allocation, Scannex course access, LU1–LU8 media/interactions, native quiz progress storage, Viewer eligibility/session controls, and password recovery. Online payment is explicitly reserved for the next version. Existing LU9 assessment material is preserved.

## Corrections

- Every invocation of the invitation Server Action now checks the current administrator session. A caller-provided actor identifier cannot bypass this check.
- Invitation failures show readable recovery instructions. The page identifies the signed-in account and provides a sign-out action that preserves the invitation link.
- Sign-in includes Forgot password. Recovery uses single-use Supabase recovery tokens and the established Resend email service. Email links are verified only after the learner selects Continue; opening a link does not consume it. A dedicated HttpOnly recovery cookie expires after 15 minutes. Password updates authenticate with that recovery token, clear the recovery state, and return the learner to sign-in.
- Shared database rate limits cap recovery requests at three per email per hour and 100 across the platform per hour. Only opaque HMAC identifiers are stored. Browser roles cannot access this table/function.
- Direct browser execution of the audit-writing RPC is revoked. Trusted server code and existing postgres-owned profile/file triggers retain their access.

## Checks completed

- 54/54 focused regression cases passed: invitation authorization, mismatched-account denial, readable feedback, SCORM persistence boundaries, Viewer eligibility/session behavior, recovery rate limiting, invalid/reused recovery links, password confirmation, missing recovery authentication, token confidentiality, and return-path validation. Run `npm run test:learner-release`.
- TypeScript check and optimized production build passed.
- Media validation confirmed 74 MP4 files are actual media objects.
- Live course checks passed for eight compiled LU entries, eight introduction videos and 61 web-object URLs on training-platform-kappa.vercel.app.
- Live database checks confirmed audit RPC access denied to anonymous/learner roles while server/trigger access remains available.
- The recovery budget was exercised under the service role in a rolled-back transaction: two permitted calls followed by a blocked third call. No QA rows remained.
- The test invitation was accepted by the email provider and the user confirmed inbox delivery. The existing unaccepted test invitation was revoked with an audit record before replacement; no invitation history was deleted.
- The user reproduced an account mismatch while signed in as administrator. Access was correctly denied. The user then reported the invitation working in a private window; creation of the matching account was confirmed. At the time of this record, email confirmation and final redemption were still pending.

## Release gates still pending

1. User completes the real password-reset email flow and signs in with the new password. The user must enter and submit credentials personally.
2. Confirm matching-account invitation redemption and course enrolment, then verify saved learner progress after leaving/reopening a learning unit.
3. Confirm the published fixes on the final production commit/deployment and record that identity before issuing the final release seal.

The older QA-to-RED roadmap suite produced 102 passes and 57 failures out of 159 tests. It includes unfinished payment/certificate/reviewer roadmap work and legacy filename/string assertions. Those tests have not been deleted or weakened. This focused pilot QA does not claim that the entire roadmap suite is green.

Human listening across every narration clip, full accessibility acceptance, and every native quiz retry/remedial route have not been independently repeated during this platform check. Previously recorded authoring evidence remains separate from live learner acceptance.

## Recovery operation

From APGI sign-in, select Forgot password, enter the learner account email, and select Send password-reset email. Open the latest email, select Choose a new password, then Continue to reset password. Enter the new password twice (at least 12 characters), save it, and sign in again. If a link is expired or already used, request a new one. An account mismatch on a course invitation requires switching to the invited account; password recovery does not grant course enrolment.

Implementation references: [Supabase recovery links](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [Supabase token verification](https://supabase.com/docs/reference/javascript/auth-verifyotp), [function permissions](https://supabase.com/docs/guides/database/functions).
