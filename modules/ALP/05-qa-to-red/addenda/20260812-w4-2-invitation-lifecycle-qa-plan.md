# QA-to-Red Plan — W4.2 Persistent Invitation Lifecycle

## Lifecycle RED cases
- QA-IL-001 admin role required for create/revoke/resend.
- QA-IL-002 create records only a hashed token, expiry, recipient/course intent and audit event.
- QA-IL-003 send is idempotent and delivery failures are observable.
- QA-IL-004 valid acceptance routes to onboarding, never directly to course/dashboard.
- QA-IL-005 expired/revoked/reused/wrong-email/wrong-course tokens fail closed.
- QA-IL-006 onboarding requires approved profile fields and shows the reason for collection.
- QA-IL-007 national ID is masked/restricted/not logged or URL-exposed.
- QA-IL-008 CV upload is private, validated and accessible only by owner/admin policy.
- QA-IL-009 redemption creates one enrolment exactly once and audit events.
- QA-IL-010 bulk import validates schema/duplicates and supports safe all-or-dispositioned execution.
- QA-IL-011 app-wide coverage manifest maps every approved capability to RED/GREEN test, owner, evidence and monitoring signal.

## App-wide QA coverage
The manifest must cover auth, profile/files, catalogue/course shell, progress, enrolment/invitation, payments, assessments/AI, certificates, admin/reporting/audit, storage/RLS and deployment/CWT. No capability may be marked complete merely because a UI exists.