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
- The user reproduced an account mismatch while signed in as administrator. Access was correctly denied. The reset email was reported delivered by Resend; the user subsequently found it, reset the password and signed in. Live account data confirmed email verification and successful sign-in.
- Live Profile saving redeemed the invitation, created the learner enrolment and displayed Scannex on Dashboard. Reopening the used invitation led straight to Dashboard without a separate acceptance step. An ordinary Profile save also completed successfully.
- Live LU1 progress was saved under its canonical unit identifier. After advancing to slide 3, leaving and reopening the activity displayed the native resume prompt; selecting Yes restored slide 3. The saved attempt remained incomplete with no pass result. No score or completion was injected.
- The owner completed a fresh-account invitation, signup, confirmation email, Profile and Dashboard test on the published release and reported the navigation working as expected. Database verification confirmed a verified email, completed profile, active learner, enrolled Scannex course and invitation redeemed by that same account. Confirmation completed at 16:29 SAST and enrolment at 16:30 SAST on 13 October 2026. Test email addresses and credentials are excluded from the public release record.

## Version 1 acceptance

1. Profile-first signup, mailbox confirmation, invitation enrolment and Dashboard access: passed in the fresh-account human test and corroborated by live database records.
2. Learner progress saving and reopening: passed in the live LU1 sample. Published structural audits cover 48 quizzes and 231 graded questions across LU1–LU8.
3. Production application baseline: commit `7a6b61ddeac5b6cfc835b541255b90a7074cf35b`, READY deployment `dpl_5QYBzVPeeCp8VUNpyQj3wAjvU1Wt` on the kappa alias. The Version 1 tag includes this baseline, version metadata, the release record and course-file integrity manifest. Resolve `v1.0.0` for the final release commit.

The owner authorized final preparation and sign-off after the successful fresh-account test. Version 1 acceptance covers administrator invitations and manual enrolment, authenticated learner access and the published Scannex course. See [Version 1 release and operating record](platform-v1-release.md) for the supported scope and recovery procedure.

The older QA-to-RED roadmap suite produced 102 passes and 57 failures out of 159 tests. It includes unfinished payment/certificate/reviewer roadmap work and legacy filename/string assertions. Those tests have not been deleted or weakened. This focused pilot QA does not claim that the entire roadmap suite is green.

Human listening across every narration clip, full accessibility acceptance, and every native quiz retry/remedial route have not been independently repeated during this platform check. Previously recorded authoring evidence remains separate from live learner acceptance.

## Recovery operation

From APGI sign-in, select Forgot password, enter the learner account email, and select Send password-reset email. Open the latest email, select Choose a new password, then Continue to reset password. Enter the new password twice (at least 12 characters), save it, and sign in again. If a link is expired or already used, request a new one. An account mismatch on a course invitation requires switching to the invited account; password recovery does not grant course enrolment.

New invited learners create their account from the invitation, open the account-confirmation email, and confirm their email to go straight to Profile. Saving Profile automatically enrols valid invited courses and opens Dashboard. No additional acceptance or approval is required. Existing confirmed learners with an incomplete profile or an unfinished valid invitation also go to Profile first, including after password recovery.

Implementation references: [Supabase recovery links](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [Supabase token verification](https://supabase.com/docs/reference/javascript/auth-verifyotp), [function permissions](https://supabase.com/docs/guides/database/functions).
