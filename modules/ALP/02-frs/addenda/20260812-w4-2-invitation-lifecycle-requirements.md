# Functional Requirements — W4.2 Persistent Invitation Lifecycle

- FRS-IL-001: Admins can create, revoke and resend governed invitations only after role and input validation.
- FRS-IL-002: Invitations are signed/single-use/expiring and bound to recipient email and course intent.
- FRS-IL-003: Accepted invitations route learners to mandatory onboarding before learner access.
- FRS-IL-004: Onboarding explains the purpose of requested profile information and supports save/validation feedback.
- FRS-IL-005: Profile stores certificate identity fields, including national identity number, under restricted access; it is never placed in URLs/logs.
- FRS-IL-006: Learners may upload a CV only to protected storage.
- FRS-IL-007: Redemption creates exactly one applicable enrolment and complete audit trail.
- FRS-IL-008: Import execution validates all rows, duplicates and partial-failure disposition before any write.
- FRS-IL-009: Admin and learner views expose status without raw tokens or unmasked identity numbers.
- FRS-IL-010: AI is excluded from this wave; future learner-support/career guidance must be separately approved.