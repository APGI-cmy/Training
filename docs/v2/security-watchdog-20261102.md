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

34 focused tests cover access, origin validation, scoped exports, tamper detection, receipt ownership, failures, positive controls, cleanup and repeated-run protection. TypeScript passes. A four-page sample PDF was generated and its first page rendered for layout inspection. Native authenticated-platform testing and release identifiers are recorded below after deployment.

Database migration: `20261102102533_security_watchdog_scoped_assurance.sql`, applied only to V2 `eaaqgtdpvbxdgjxphjie`. All four new tables have RLS; all eight new RPC functions are invoker functions and have no anonymous/authenticated execute grants.

## Operational follow-up

Keep the signing secret backed up through the approved secret-management process. A future key-rotation protocol must retain approved verification keys for old reports; replacing the sole configured key would intentionally block verification of earlier reports. Independent evidence anchoring is separate.

The page displays the latest 30 runs and latest 50 management references; all older database records are retained. An interrupted run without a signed payload has status/history but cannot export a completed report. A cleanup-retry success updates operational cleanup state without rewriting the original signed result; run a fresh test for new assurance evidence.
