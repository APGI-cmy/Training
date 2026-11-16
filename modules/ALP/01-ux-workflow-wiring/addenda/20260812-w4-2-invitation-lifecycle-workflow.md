# UX Workflow — Invitation to Learning Access

1. Admin selects a learner or validated import row, reviews privacy notice and creates an invitation.
2. System sends a single-use, expiring invitation link and records created/sent audit events.
3. Learner opens the link; email/token/course eligibility is validated before any account change.
4. Learner signs in or registers, then is directed to onboarding—not the dashboard.
5. Onboarding explains that identity/profile information supports verified training records, certificate authentication and learner support. It captures required profile fields and optional CV.
6. On verified completion, the invitation is redeemed and the agreed enrolment is created idempotently.
7. Learner lands on My Learning with the enrolled course. Admin can see invitation/enrolment audit status.

Failure paths: invalid/expired/revoked/reused/wrong-email invitations fail closed with a non-sensitive support route; no learner PII or raw token is exposed in URLs beyond the single invitation token.