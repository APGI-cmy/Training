# Security Watchdog - V2 scoped technical evidence

Implements the approved first Watchdog on the training platform. Verified platform principals can oversee all scopes. Verified company owners can start checks and retrieve reports only for their own active company. General administrators do not inherit platform-wide Watchdog access.

## Implemented controls

- Server-authorised dashboard, bounded run, immutable signed report payload, JSON/PDF export, own-recipient read receipts and dated management evidence register.
- Three disposable fictional identities, two synthetic companies and canary rows, with normal signed-in API probes. Positive access controls must succeed before a corresponding denial counts as successful isolation.
- Existing profile and membership RLS, existing company server guard, anonymous access, company-owner versus learner access, cross-company report/export gate and in-app drill routing.
- Live RLS, private evidence storage, report privilege and client destructive-grant configuration checks. No destructive probe is executed.
- Ed25519 signatures using a dedicated production-environment secret on the V2 hosting project. Only the verification key is public. Exports verify against the configured trusted key, rather than trusting an arbitrary embedded key.
- Atomic server-only database start, idempotency, one active test at a time, 90-second operator cooldown and 20 runs per day. No user-controlled SQL or target URL.
- Fixture cleanup in `finally`, narrowly tagged deletion guards and a protected five-minute retry sweep. Unfinished checks remain inconclusive; cleanup failures remain visible. Previous reports stay retained.

The fixtures use the isolated V2 staging database. They do not copy customer content and do not grant real participants any new rights. Cleanup removes only newly provisioned run-tagged identities and their synthetic records. Test credentials are never stored in evidence or returned to the browser. No course fingerprint, review coverage, commercial approval or payment route is changed.

## Honest limits and outstanding adapters

This is point-in-time technical evidence, not an assertion that information has never leaked, a continuous detection service or an ISO certificate. The UI and reports name their limitations. Other business-data routes, storage downloads, exports, caches and jobs need additional adapters. MFA/password provider settings, external email/SMS alerts, outbound DLP, AI integrations, restoration exercises, organisational controls and independent ISO assessment remain explicit gaps.

An in-app drill receipt confirms only the signed-in recipient's reading. It neither acknowledges for another recipient nor approves or resolves a technical finding. Management evidence is self-reported, dated and expiring; it never turns an automated test green.

The application and test model are separated under `src/lib/security-watchdog.ts` and `src/server/security-watchdog/`. Other applications need their own validated identity, scope, probe, fixture and cleanup adapters before this is reused. Do not copy the V2 project/database identity into another application.

## Local verification before deployment

35 focused tests cover access, origin validation, scoped exports, tamper detection, receipt ownership, revoked ownership, failures, positive controls, cleanup and repeated-run protection. Another 36 adjacent company, catalogue and payment-access tests pass. TypeScript passes. A four-page sample PDF was generated and its first/last pages rendered for layout inspection.

Database migration: `20261102102533_security_watchdog_scoped_assurance.sql`, applied only to V2 `eaaqgtdpvbxdgjxphjie`. All four new tables have RLS; all eight new RPC functions are invoker functions and have no anonymous/authenticated execute grants.

## Deployed runtime and authenticated verification

- Application commit `2b562b38f3083e78743506bd248b3d01bc6911ec`; ready deployment `dpl_5tCGS7FTTPkqjLPNDDjhFHgtpmh8`, promoted to https://training-platform-v2-staging.vercel.app.
- Full archive verified: 18,814 files, 30 source overlays. Environment boundaries, 210 MP4 files, four course manifests, compilation and TypeScript passed on Vercel. All four course fingerprints equal the preceding release.
- Initial live testing exposed two integration issues that mocks had not caught: the existing service role has deliberately limited Auth-column grants, and a void PostgREST function returns no JSON body. Both incomplete reports remain in history; their fixtures were cleaned.
- Applied `20261102104832_security_watchdog_fixture_auth_reader.sql`: a narrow service-only `SECURITY DEFINER` helper returns only validated, newly created synthetic user IDs. Its search path is empty; anonymous/authenticated execution is revoked. It does not grant broad access to Auth metadata or credentials. The original seed/cleanup functions remain invoker functions.
- Applied `20261102105224_security_watchdog_seed_result.sql`: atomic seed returns a JSON completion result. A service-role transaction probe confirmed the seed and rolled back its temporary test records. All nine Watchdog functions have no anonymous/authenticated execute privileges.
- Final live run `ead4121d-dd79-44c8-b6b5-b5d096e5bb8a`, completed 2026-11-02 at 12:52 SAST: **20 passed, one attention item, five not-tested areas**. All synthetic boundary probes and in-app alarm routing passed. No completed check was reported inconclusive.
- The attention item is existing client-role TRUNCATE grants. No destructive operation was performed. Those privileges require a separately tested hardening change. The five broader gaps are visible in the dashboard and report; this is not a full-system or ISO certification pass.
- All temporary users, companies and canaries are absent. Real users (28), companies (16) and memberships (12) equal the pre-test counts. All three saved course-review rows have the same digest `c375f615ed3784e80e0a210f08bd1cc6`; both commercial-setting rows have the same digest `136818e418f70f24365c9240f65178fc`.
- Authenticated signed JSON download succeeded and its signature was independently verified locally against the separately retained public key. `scripts/verify-watchdog-report.mjs` reproduces this offline verification.
- The initiating user's read receipt is recorded; the other principal's receipt remains unread. Dashboard, cron and report access deny unauthenticated callers; foreign report/export and revoked-company guards are covered by focused tests and live synthetic scope probes.
- Edge initially displayed `ERR_BLOCKED_BY_CLIENT` for the PDF, while the platform recorded HTTP 200 responses. No browser protection was disabled or bypassed. The user subsequently confirmed the PDF had downloaded to Downloads. The actual three-page A4 file was inspected locally; it identifies the final run, source/deployment, cleanup and honest assurance limits.

Live navigation: **Policies and administration > Security Watchdog**. Dashboard screenshot: `qa/security-watchdog-live-20261102.png`. Detailed local archive/build, signed-export and database evidence is under `C:/Users/Johan/Codex-Work/security-watchdog-20261102/`.

## Operational follow-up

Keep the signing secret backed up through the approved secret-management process. A future key-rotation protocol must retain approved verification keys for old reports; replacing the sole configured key would intentionally block verification of earlier reports. Independent evidence anchoring is separate.

The page displays the latest 30 runs and latest 50 management references; all older database records are retained. An interrupted run without a signed payload has status/history but cannot export a completed report. A cleanup-retry success updates operational cleanup state without rewriting the original signed result; run a fresh test for new assurance evidence.
