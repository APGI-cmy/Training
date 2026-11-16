# App Description Addendum — W4.2 Persistent Invitation Lifecycle

## Purpose
Turn the merged PR #104 draft-only learner-management experience into one secure, auditable lifecycle: administrator creates a controlled invitation; learner accepts it; learner completes onboarding; the system grants the agreed course enrolment; learner accesses the course.

## In scope
- Supabase-backed invitation, learner-profile and enrolment lifecycle.
- One controlled test learner for end-to-end proof.
- First-login onboarding: explanation of why profile data is needed; required identity/contact profile; optional CV upload.
- Protected national identity number suitable for later certificate verification.
- Invitation create, send, accept, expire, revoke and resend, with audit events.
- CSV/XLSX execution only after validation, duplicate handling and explicit approval.

## Boundaries
No payment work, assessment, certificate generation, AI capability, or production bulk import is in scope. AI remains a future functional learner-support/career-guidance decision, requiring separately approved requirements, safety, escalation and human-oversight design.