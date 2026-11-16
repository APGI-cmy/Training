# Implementation Plan — W4.2 Persistent Invitation Lifecycle

1. Approve this prebuild stack and produce the app-wide QA coverage manifest.
2. Inspect live Supabase schema, auth and RLS; create schema-to-hook/table-pathway/RLS RED evidence.
3. Create lifecycle-specific executable QA-to-Red tests and prove correct RED.
4. Obtain builder appointment for the frozen scope.
5. Implement migrations, RLS, private CV storage and registered server/Edge Functions.
6. Implement admin creation/send/revoke/resend, invitation acceptance and mandatory onboarding.
7. Implement idempotent redemption/enrolment and audit views.
8. Build lifecycle tests to green; run regression, typecheck, build and security checks.
9. Use one agreed test learner for preview proof: invite → accept → onboarding/profile/CV → enrolment → learner access.
10. Independent review, exact-head CI/preview evidence and final merge decision.

AI is explicitly deferred.