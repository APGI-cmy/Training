# Enrolment and Scannex assessment operations

## Live lifecycle

1. An administrator sends a one-time, expiring course invitation from **Administration → Invitations**.
2. The learner signs in, or creates an APGI account with the same email address, and accepts the invitation.
3. The platform creates or confirms the learner profile and learner role, records the enrolment audit event, and grants access to the course.
4. For a corporate group, an administrator stages a CSV/Excel import and explicitly confirms the batch send. The source spreadsheet is not retained by the platform.
5. When an enrolled learner is ready for the practical assessment, an administrator creates a booking in **Administration → Scannex assessments**. The generated assessment reference identifies the learner without sharing a Viewer password.
6. The assessor uses that reference in the saved Scannex Trainer result, Viewer Movement Log and assessor checklist. The names or approved references are then indexed against the booking and an assessor decision is recorded.

## Required production settings

The invitation sender uses Resend. Set these server-only Vercel variables before sending the first real invitation:

- `RESEND_API_KEY` — a Resend API key with permission to send transactional email.
- `EMAIL_FROM` — a verified sender, for example `APGI Training <training@your-verified-domain>`.
- `NEXT_PUBLIC_APP_URL` — the public HTTPS URL of this training application.

The Supabase project must also have email/password authentication enabled and its Site URL and allowed redirect URL set to the public training-app URL. If email confirmation is enabled, configure Supabase Auth to use an approved SMTP sender before the first learner registration.

## Payment boundary

Payment is deliberately not activated until APGI selects a payment provider and approves its commercial, tax, refund, privacy and webhook requirements. The future provider webhook—not a browser return page—must create the `payment` enrolment source only after verified payment confirmation. Corporate allocations and complimentary access continue through the invitation route.

## Scannex boundary

Enrolment grants the online course. It does not provide a shared password or direct public access to the local Windows Viewer. The current practical assessment remains supervised at an approved Scannex station. A later hosted Viewer Lab requires Scannex licence confirmation and a separate security review.

## Evidence boundary

The platform now indexes evidence references and assessment decisions. The local Scannex result and Movement Log remain the native source records. Store the actual files in the approved evidence location using the assessment reference in their filenames; do not place workstation paths, passwords or personal identity numbers into the platform record.
