# Version 2 administration and certificate test release

This development release runs only at https://training-platform-v2-staging.vercel.app. The Version 1 website, database, learner accounts and published Scannex media remain unchanged. Real learners must continue to use Version 1 until a separate release is approved.

## Administrator access

Johan's separately created, verified staging account is `johan.ras@apginc.ca`. Its administrator role was assigned only in the isolated database. Its password is entered privately by Johan and is not copied from Version 1.

Open Administration after signing in. The hosting project's existing Vercel sign-in protection remains enabled.

## Invitations and groups

- Invitations now select Learner or Administrator. Learners select courses and an optional organisation group. Administrator invitations require an explicit full-access confirmation; the invite stores the role but grants no role until the verified matching account completes Profile.
- Only a current administrator can create administrator invitations. Redemption rechecks the inviter's authority, expiry, revocation, exact verified email and Profile. The database grants the role transactionally and records an audit event.
- Create named groups on Invitations. An ungrouped enrolment is displayed as **Individual learner (no group)**. Groups belong to an organisation and cannot be assigned across organisations.
- Bulk imports accept `group_name` and a default group. Create the named group first; an explicit row name overrides the default. Administrator invitations must be made individually, not by bulk import.
- Staging creates private invitation links and does not send email. For new accounts, confirmation and reset links are captured in **Test messages**, accessible only to signed-in administrators. Use each link with its matching fictional test account. Passwords are never stored in this message table. Auth-provider expiry and single-use rules still apply.

## Notifications and progress

The inviter receives an in-app notification when a verified learner saves Profile and an invitation becomes an enrolled course. An invited administrator joining also creates a notification. Repeating redemption does not duplicate the notification. Administration shows the unread count; Notifications supports marking each record as read.

Learners displays per-course unit completion bars, completion counts, group assignment and latest saved activity. Scannex progress counts its eight required learning units; its summative assessment remains separate. A 100% learning bar does not by itself authorize certification. Failed progress reads display unavailable rather than an invented completion percentage.

No enrolment notification email is sent from staging. Enabling a future real email delivery channel requires a release plan; it is not part of this isolated test deployment.

## Certificates

Certificate designs offers ten styles: Classic, Executive, Modern, Ribbon, Minimal, Heritage, Geometric, Academy, Prestige and Horizon. The organisation chooses one design; its name, logo and colours are captured in the certificate record at issuance. Each design includes **Hosted by APGI** at the bottom right.

The course's final **My course certificate** link allows the enrolled learner to issue and download their own certificate after the database verifies the requirements. Repeat issuance returns the existing number. Revoked certificates cannot be reissued by the learner.

Scannex eligibility requires a verified learner, active enrolment, certificate name, all eight saved unit completions and the latest approved assessor pass with a final score of at least 75. It also requires the controlled practical rubric without a material safety concern, a theory-attempt reference, Scannex result evidence, Viewer movement log and assessor checklist. Self-directed Viewer practice does not replace the supervised assessment.

VPSHR Level 0 currently requires its configured introduction plus twelve learning units. Each course has explicit database completion requirements; an unknown course cannot self-issue a certificate.

Every certificate has a unique number, immutable signed record, QR code and verification address. A server-held HMAC key authenticates the record including the number, learner, course, organisation, date and branding snapshot. Verification reveals the certificate identity and validity, not private account emails, user IDs or marks. PDF downloads are restricted to the owner or an administrator. This is register-based authentication, not an X.509 digital signature on the PDF. Staging certificates carry a conspicuous TEST label and are not valid qualifications. The staging verification page remains behind the project's Vercel protection.

## Verification on 14 October 2026

- 125 release and feature tests passed; 51 established regression tests passed; TypeScript checking and the complete application build passed. Invitation tests explicitly select their mocked delivery environment so inherited CI staging variables cannot create false failures; a dedicated test verifies no email service call in staging.
- Seven guarded integration cases passed against the isolated database: profile gate, learner enrolment/group/notification, wrong-mailbox rejection, administrator grant/idempotence, all-unit requirement, assessor gate and one numbered authenticated PDF after fictional assessor approval.
- An additional real integration case passed: invited account creation, privately captured confirmation, actual provider email verification, captured password recovery with a safe return address, and denial of privileged message/role/certificate operations to anonymous and ordinary authenticated clients.
- All ten certificate PDFs were generated and rendered for visual review. Font embedding supports the tested accented and Cyrillic names. The final design review corrected border and footer overlaps.
- The fictional test records are intentionally retained in staging. They use `example.invalid` addresses and include QA Sample Learner, QA Sample Administrator, QA Demonstration Group and one TEST certificate. They are not real assessments or learner records.
- Supabase reported no security ERROR findings. The informational RLS-without-policy findings are intentional for server-only tables. Three inherited authenticated SECURITY DEFINER helpers remain callable for self-scoped role/invitation checks used by RLS. Inherited leaked-password protection is disabled; no paid setting was enabled.

Opt-in database integration tests require ignored staging credentials and the isolation guard. They are excluded from normal CI. No secret values, human passwords or Auth tokens are committed.

## Release boundary

All four feature migrations have been applied only to `eaaqgtdpvbxdgjxphjie`. Build and runtime safeguards reject the Version 1 hosting project, database or live email/payment/Viewer credentials. Development stays on `v2-development`; do not merge these changes or the Supabase branch into production.

A future learner release requires review of completion criteria, real notification delivery, public certificate verification, existing enrolment/progress preservation and rollback. This test release does not change officially enrolled learners' access or courses.
