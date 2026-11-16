# Architecture — W4.2 Persistent Invitation Lifecycle

Components: Admin Workspace → server-side invitation service → Supabase invitation/profile/enrolment/audit tables → registered email delivery adapter → invitation landing → Auth → onboarding → protected CV Storage → idempotent redemption → My Learning.

Trust boundaries:
- Browser has only authenticated user session and one-time invitation token.
- Server/Edge Function validates role, token, email binding and lifecycle state.
- Service credentials remain server-side.
- RLS grants learner ownership access and narrowly scoped admin management; national-ID access is separately restricted.
- URL/content-source branch remains unchanged.

Required evidence: migration review, table-pathway audit, RLS audit, red-to-green QA evidence, preview browser evidence, controlled test-learner proof, independent review.