# Scannex first-learner QA — 13 October 2026

Scope: administrator-issued course invitations and manual allocation, Scannex course access, LU1–LU8 media/interactions, native quiz progress storage, Viewer eligibility/session controls, and password recovery. Online payment is explicitly reserved for the next version. Existing LU9 assessment material is preserved.

## Corrections

- Every invocation of the invitation Server Action now checks the current administrator session. A caller-provided actor identifier cannot bypass this check.
- Invitation failures show readable recovery instructions. The page identifies the signed-in account and provides a sign-out action that preserves the invitation link.
- Sign-in includes Forgot password. Recovery uses single-use Supabase recovery tokens and the established Resend email service. Email links are verified only after the learner selects Continue; opening a link does not consume it. A dedicated HttpOnly recovery cookie expires after 15 minutes. Password updates authenticate with that recovery token, clear the recovery state, and return the learner to sign-in.
- Shared database rate limits cap recovery requests at three per email per hour and 100 across the platform per hour. Only opaque HMAC identifiers are stored. Browser roles cannot access this table/function.
- Direct browser execution of the audit-writing RPC is revoked. Trusted server code and existing postgres-owned profile/file triggers retain their access.
- New learners must complete their profile before opening Dashboard, Catalogue or a learning unit. Staff routes remain available. Profile completion uses the existing required certificate-name field.
- Saving any learner profile automatically enrols valid, unexpired course invitations addressed to the learner's authenticated, verified email. The page lists those courses before saving, including when the profile was completed earlier. Enrolment no longer depends on a hidden onboarding field, and the separate acceptance screen is removed. Recipient/status/expiry checks are repeated on the server, and existing saved profile details are preserved during enrolment.
- Signup confirmation emails use the established Resend delivery service rather than Supabase's built-in mailer. The single-use confirmation is verified after an explicit button click, establishes the provider-authenticated session, and directs the learner to Profile. Signup and recovery have separate shared email rate limits. No email-verification requirement has been disabled.

## Checks completed

- 91/91 focused regression cases passed: invitation authorization, mismatched-account denial, readable feedback, SCORM persistence boundaries, Viewer eligibility/session behavior, recovery rate limiting, invalid/reused recovery links, password confirmation, missing recovery authentication, token confidentiality, return-path validation, profile-first routing, save-before-enrolment ordering, verified-recipient invitation acceptance, signup confirmation delivery and confirmation-to-Profile routing. Run `npm run test:learner-release`.
- TypeScript check and optimized production build passed.
- Media validation confirmed 74 MP4 files are actual media objects.
- Live course checks passed for eight compiled LU entries, eight introduction videos and 61 web-object URLs on training-platform-kappa.vercel.app.
- Live database checks confirmed audit RPC access denied to anonymous/learner roles while server/trigger access remains available.
- The recovery budget was exercised under the service role in a rolled-back transaction: two permitted calls followed by a blocked third call. No QA rows remained.
- The test invitation was accepted by the email provider and the user confirmed inbox delivery. The existing unaccepted test invitation was revoked with an audit record before replacement; no invitation history was deleted.
- The user reproduced an account mismatch while signed in as administrator. Access was correctly denied. The user then reported the invitation working in a private window. The reset email was reported delivered by Resend; the user subsequently found it, reset the password and signed in. Live account data confirmed email verification and successful sign-in. Invitation redemption was still pending before the new profile-first flow was published.

## Release gates still pending

1. Completed: live Profile save redeemed the matching invitation, created the learner enrolment, and displayed Scannex on Dashboard. The ordinary Profile save regression and read-only invitation-link routing are covered by the current 91 tests.
2. Verify saved learner progress after leaving/reopening a learning unit. The new signup-confirmation route has regression coverage; an additional fresh-account human signup/email test has not yet been performed after replacing the built-in mailer.
3. Confirm the published fixes on the final production commit/deployment and record that identity before issuing the final release seal.

The older QA-to-RED roadmap suite produced 102 passes and 57 failures out of 159 tests. It includes unfinished payment/certificate/reviewer roadmap work and legacy filename/string assertions. Those tests have not been deleted or weakened. This focused pilot QA does not claim that the entire roadmap suite is green.

Human listening across every narration clip, full accessibility acceptance, and every native quiz retry/remedial route have not been independently repeated during this platform check. Previously recorded authoring evidence remains separate from live learner acceptance.

## Recovery operation

From APGI sign-in, select Forgot password, enter the learner account email, and select Send password-reset email. Open the latest email, select Choose a new password, then Continue to reset password. Enter the new password twice (at least 12 characters), save it, and sign in again. If a link is expired or already used, request a new one. An account mismatch on a course invitation requires switching to the invited account; password recovery does not grant course enrolment.

New invited learners create their account from the invitation, open the account-confirmation email, and confirm their email to go straight to Profile. After they save the profile and accept the invitations shown there, they go to Dashboard with their enrolled course ready to open. Existing confirmed learners with an incomplete profile also go to Profile first, including after password recovery.

Implementation references: [Supabase recovery links](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [Supabase token verification](https://supabase.com/docs/reference/javascript/auth-verifyotp), [function permissions](https://supabase.com/docs/guides/database/functions).
