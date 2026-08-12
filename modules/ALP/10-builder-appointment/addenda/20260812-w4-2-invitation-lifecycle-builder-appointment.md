# Builder Appointment — W4.2 Persistent Invitation Lifecycle

Appointment ID: `APPT-ALP-W4.2-IL-001`  
Builder Candidate: `BC-ALP-W4.2-IL-001`  
Date: 2026-08-12

## Authority
The product owner authorised progression after PR #105 prebuild and the accepted correct-RED baseline in CI run 31611852576.

## Frozen scope
Implement only the W4.2 lifecycle: secure invitation create/send/revoke/resend; accept-to-onboarding; profile explanation/completion and private CV; protected national identity handling; idempotent enrolment redemption; audited, governed import execution; associated Supabase migrations/RLS/Storage/registered server functions.

## Mandatory controls
- Start from the RED tests; build them to GREEN without weakening assertions.
- Resolve the RLS/security baseline blockers recorded in the RED evidence.
- No payment, assessment, certificate generation, AI integration, unrelated media/content branch work, or production deployment.
- No test learner, invitation or email send until the preview implementation passes automated checks and the product owner nominates the controlled learner.
- File schema-to-hook, table-pathway, RLS audit, CI/preview and browser evidence before review.

## Completion gate
One controlled learner completes: invite → delivery → accept → onboarding/profile/CV → enrolment → learner access.