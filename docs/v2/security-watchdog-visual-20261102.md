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


## Final deployed verification

- Final application source: `d5c28451aa92c9078639654e117e6e4dd09a5f5b`. Ready deployment: `dpl_CdWrJb35zVP5KvKzsfkBvXFhGUWx`, promoted to the canonical V2 staging domain. Candidate and canonical source/project/course identities were checked. The final archive contains 18,839 files and 63 verified application overlays.
- Final controlled run: `f7637e06-ad1d-4f92-97a4-b2c35eb49aad`, completed 2026-11-02 at 14:54 SAST. It contains 42 named checks: 36 passed, one attention item (zero of two principal accounts have privately enrolled TOTP), five untested broader areas, zero failed and zero inconclusive. Temporary fixture cleanup completed. The displayed percentage is conservatively floored to 85%.
- Real live probes passed: profiles and same-company personal separation, foreign company guard, report/export scoping, five business-table direct-access denials, private PNG-file positive control and two negative controls, synthetic TOTP verification/AAL2, active/revoked sessions, synthetic record restoration, fictional-recipient email rejection and in-app alarm routing.
- Live testing caught a fixture issue: the evidence bucket intentionally accepts PNG only. The initial text fixture was rejected, so its access checks were incomplete. It was replaced with a harmless one-pixel PNG; the bucket restriction was retained. Earlier incomplete reports remain unchanged in history.
- The protected five-minute cron was observed firing after deployment. After the fixture correction, the protected cron was also triggered through the native hosting command and completed successfully. Daily/deployment claims, last-completion recording, alert delivery and cleanup were exercised. The new-deployment retry rule was tested in a rolled-back transaction: a different deployment is eligible immediately, while an immediate repeat of that same deployment stays delayed. Concurrent claims remain atomic.
- The test-alarm email was accepted by the provider and the user confirmed it arrived in the inbox. Delivery acceptance and recipient reading remain separate. A real attempt to acknowledge another principal's test alert returned false. No other person's receipt was recorded. Saved hardening action progress retained one history entry and did not alter any test score.
- The visual gauge, category drill-down, exact specialist-row navigation, historic report access and scaled trend bars were checked in the authenticated Edge session. The final dashboard was left open. Private local screenshots are `watchdog-overview-final.jpg` and `specialist-focus-final.jpg` under the QA directory.
- Both final JSON and PDF downloaded successfully through the real Edge controls. The JSON signature was independently verified with the separately retained trusted public key. The four-page PDF layout was checked on all pages. Final downloads are in the user's Downloads directory with the final run ID above.
- Real data after tests: 28 users, 16 companies, 12 memberships, zero synthetic users/canaries/files. Review rows remain three with digest `805c8c58104260ad5042deb61e10c9c2`; commercial rows remain two with digest `21ed13ec61b393c9db9e8f3236a18fb4`. These match the pre-promotion snapshot using ordered JSON aggregation. All four course fingerprints match the preceding live release; no reviews were reset.
- No client TRUNCATE grants remain. None of the Watchdog public RPCs or private elevated helpers is executable by anonymous/authenticated roles. Existing advisor warnings for three current-user policy helpers were inspected: they bind identity to the verified JWT, rather than accepting a caller-supplied user ID; no existing helper or policy was relaxed. Provider leaked-password protection still needs owner/provider configuration review: [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- The full local release suite passed 987 tests with one existing skip; all 50 focused Watchdog tests and TypeScript passed. The production dependency audit reports zero vulnerabilities. The real Vercel build passed with transactional staging email enabled and payments/Viewer disabled.
- Automatic approval review blocked deletion of the temporary local `.env.live.local` file under the external QA directory, without a more specific reason. It was left in place; cleanup was not retried through another mechanism. Hosting Secret values could not be pulled, and the attempted local direct-provider integration could not start with those placeholders. Deployed synthetic tests subsequently verified the actual provider integration.

Remaining work is explicit in the dashboard: account owners enrol authenticators; complete broader route/export/job and outbound/provider coverage; perform a real separate-environment backup restoration and independent security assessment; approve organisational policies/training; and repeat enabled-integration tests in the approved production environment. This release does not provide a 100% guarantee or ISO certification.
