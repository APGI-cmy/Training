# Security Watchdog: visual overview and operational controls

This release extends the scoped V2 staging Watchdog. It does not certify ISO compliance, assert that information has never leaked, or modify V1.

## Administrator experience

- A percentage gauge counts passed named checks against every named check, including failures, inconclusive checks and untested areas. Empty evidence never becomes 100%. Findings and stale evidence remain prominent.
- Click counts or category bars to drill down to the exact check, explanation and next action. Comparable history is restricted to the same company scope and suite edition.
- The complete specialist report remains in the app and downloadable as PDF and signed JSON. Historical reports retain their original evidence and trusted verification keys.
- Ten action items allow an owner, target date, status and evidence reference. Saved updates retain history. A self-reported evidence statement never changes a technical result to passed.

## Technical changes

- Removed client-role TRUNCATE grants and unsafe default TRUNCATE privileges without performing a destructive operation. Existing SELECT/INSERT/UPDATE/DELETE permissions are unchanged.
- Added private-file positive and negative controls, direct database-bypass checks for five business data tables, active/revoked-session checks, synthetic authenticator enrolment/AAL2 challenge, bounded fictional-record restoration and fictional email-recipient rejection.
- Added owner-driven private authenticator setup. Provider-verified enrolled TOTP accounts require AAL2 before normal platform access. Unenrolled owners remain a visible attention item. Removing a verified authenticator is deliberately unavailable from the AAL1 setup form.
- Added a fail-closed server session check against active provider sessions. Signing out attempts provider revocation before clearing local cookies.
- Automatic platform checks run daily and after changed deployments through the existing protected five-minute scheduler. Company owners can enable their own scope. Atomic claims prevent parallel fixture runs.
- Instrumented sign-in failures and company-access denials record minimal events without passwords, tokens, raw email/IP addresses or message content. Event bursts raise deduplicated alerts.
- Scoped external alerts use the existing transactional delivery ledger, retries and idempotency. A test alarm targets the initiating account only. Each recipient records only their own reading. One reminder is queued for an unread accepted non-test alert after 24 hours; reminders do not generate reminders.
- Trusted old public verification keys are retained for approved signing-key rotation. Private secrets are never included in reports.
- Upgraded Next.js to 16.4.4 and constrained Zod to the patched 4.6.6. The production dependency audit reports zero vulnerabilities. Isolated dependencies and build artifacts are outside OneDrive.

## Verification and scope limits

Local verification: TypeScript; 50 Watchdog checks; 987 learner-release checks passed, one existing skip. Full course assets were restored into the external QA worktree from the already verified deployment archive. The course manifest was regenerated; all four fingerprints equal the live release, avoiding an unnecessary review reset. PDF first and last pages were rendered and visually inspected.

Live integration and deployment evidence will be recorded below after promotion. Local mocks do not establish live MFA, email delivery or scheduler success.

Still requiring separate work/evidence: exhaustive application-route/export/cache/job isolation tests, provider-wide firewall/log retention and outbound controls, real backup restoration into an approved separate environment, owner authenticator enrolment, provider password/recovery settings, independent penetration testing, organisational policies/training and production integration assessment. The synthetic restoration exercise is not a production-backup restoration. Provider mail acceptance is not proof of inbox delivery.

Detailed temporary build/test evidence: `C:/Users/Johan/Codex-Work/watchdog-visual-20261102/`.
