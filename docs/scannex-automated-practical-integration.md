# Scannex automated practical integration

25 September 2026. This is the APGI application integration and scoring contract. Genuine AWS learner delivery is **not enabled**. Synthetic tests establish software behavior, not the accuracy of native Scannex observations.

## User journey

The learner opens Scannex LU9 → Practical assessment, submits a preferred date using **I am ready for the practical assessment**, and sees the pending request. APGI emails `johan.ras@apginc.ca` through the existing Resend configuration. A provider acceptance is recorded separately from a confirmed delivery; a saved request remains visible if email fails.

The administrator opens **Assessments → Automated practical → Manage readiness requests and case versions**, selects an approved case and grants an access window of up to 24 hours. Form times explicitly use South African time (UTC+02:00). The learner sees the same window. The application requires active enrolment, a completed knowledge attempt, an approved case, the current access window and enabled hosting before generating a 60-second AWS launch URL.

A reconnect reuses the attempt, assigned case and knowledge result. The genuine Viewer stream uses the official AWS embedding kit. Instructions and a structured checklist remain in APGI. Authenticated checklist submission locks the answers. Signed native evidence is checked against the attempt, case digest, image hashes, capture interval, collector nonce and validated adapter version before automatic scoring. A result becomes visible without an assessor entering marks.

## Marks and records

- `scannex-practical-v2`: 21 rubric items, exactly 100 available marks. Each approved check awards a defined part of its item's marks. The practical contribution is `practicalScore × 0.32`; final score is frozen knowledge score `/68` plus practical contribution `/32`.
- A final score of at least 75 passes only when all required evidence is present and all safety-critical checks pass.
- Missing fields, invalid observation types or incomplete capture produce **incomplete**, with no numerical final result. Explicit wrong observations can earn zero.
- Historical v1 bookings and the legacy 99-mark normalization are not migrated or recalculated.
- New private tables hold case versions, readiness requests, attempts, original native evidence and audit events. They have RLS and no anonymous/authenticated Data API grants. RPCs are security-invoker, service-role only, with enrolment/role/state checks where applicable.
- Case versions and original native captures cannot be updated or deleted by the application database role. Final result, evidence digest and checklist retries are idempotent; contradictory resubmissions are rejected.
- The new admin page shows recent automated results. No certificate or unrelated course-completion behavior has been added.

## Case authoring

The first administrator editor saves versioned JSON drafts and approved definitions. Drafts may be incomplete and cannot be assigned. An approved definition must contain:

1. Title, learner instructions, exact native exercise reference and SHA-256 hashes of the assigned images.
2. Validated adapter version, structured checklist prompts and permitted answer options.
3. Marking checks for every rubric item, totalling its maximum. Check fields name **validated observations**, not browser clicks. Supported comparisons are exact equality, required list values, minimum and maximum numeric values. Target matching, image coordinates, movement coverage and context-sensitive mode use must be computed by the validated native adapter before those observations can be trusted.
4. Required safety-critical operational checks and an authenticated checklist signature check.

No real answer key is bundled. The five-case pilot register is blank/unapproved. `tests/scannex/fixtures.ts` contains synthetic data only and must never be imported as an operational case.

## Native evidence contract and outstanding implementation

`POST /api/scannex/evidence` accepts an immutable JSON capture of at most 1 MiB. It requires headers `x-scannex-timestamp` (Unix seconds) and `x-scannex-signature` (lowercase hex HMAC-SHA256 of `timestamp + '.' + exact UTF-8 body`). Signatures expire after five minutes; identical body retries are deduplicated in the database. A different digest for the same attempt is rejected.

The body carries `attemptId`, `caseHash`, `nonce`, `adapterVersion`, `imageHashes`, `startedAt`, `endedAt`, `captureComplete`, `facts`, and two original artifacts (`scannex_result`, `movement_log`) as canonical Base64 plus SHA-256. Original bytes are retained privately. The capture must finish inside the approved window; delivery can retry for 15 minutes afterwards. Larger real exports will need a private object-storage upload path before activation.

**An HMAC proves the sender, not that native observations are correct.** There is no implemented or validated native Scannex parser/collector yet. Before setting the verified adapter version, produce actual native results and Movement Logs; map every scored field to observed behavior; test missing/wrong targets, movement gaps and incorrect operations. Protect the collector process and signing secret from the learner account, and prove that learners cannot fabricate or alter its input evidence. Learner-side JavaScript and AppStream connection events are not practical evidence.

The remote launcher/collector must also enforce the absolute access expiry, finish/export unattended, recover safely from disconnects, and terminate the AWS session after evidence delivery. The 60-second streaming URL validity only limits initial authentication; it does **not** end an already-running AWS session.

## Hosting activation gates

The Windows Server 2022 Ireland development builder `apgi-scannex-dev-builder` passed initial Viewer/TrainingTool/calibration compatibility checks and is stopped. No learner fleet, stack or published image exists yet.

Before enabling `SCANNEX_LIVE_ENABLED=true`:

1. Confirm approved cases/answer keys and calibrate every rubric observation against known correct and incorrect actions.
2. Disable the TrainingTool's automatic display of correct annotations during a summative attempt using a supported, tested assessment configuration. This remains unverified.
3. Implement and validate the collector and protected signing secret under a restricted Windows learner account. Validate original exports and every predicate; the synthetic fixture adapter is never valid for learners.
4. Test learner isolation, file permissions, controlled database access, unattended launch, recovery, absolute expiry and AWS session termination. Configure HTTPS outbound connectivity; the current builder has default internet access disabled.
5. Publish the image and create a controlled on-demand fleet and stack. Add the exact APGI embedding domain. Configure copying, file transfer and application access appropriately for the assessment. Keep idle capacity/costs within the approved budget.
6. Configure Vercel OIDC and a restricted AWS role that can only create streaming URLs for the chosen stack. Verify actual OIDC issuer settings before using a trust policy. No AWS access keys are required by this implementation.
7. Configure the server-only settings listed in `.env.example`. Verify Resend sender configuration and the notification in Johan's inbox with an explicitly identified test request.
8. Complete an authenticated end-to-end browser test using a designated test learner: request → email → approve → native exercise → automatic exports → checklist → scoring → final result. Include reconnect, expiry, revoked enrolment and failed upload tests before real learners.

## Validation performed

- `npm run test:scannex`: scoring, capture integrity, signature expiry, API authentication, response privacy and negative cases. These use synthetic fixtures and mocked external API boundaries.
- `tests/scannex/database.spec.sql`: executed in an isolated PostgreSQL 17 container with no network or published ports. Tests real migration/RPC behavior, permissions, enrolment, duplicate requests/starts, frozen knowledge score, immutable checklist/evidence/result, completion and closed windows. Bootstrap uses minimal predecessor table definitions rather than real learner data.
- Production Next.js build and TypeScript checks pass. Existing course-media validation checks all 66 MP4 files.
- Real native scoring, AWS embedded learner delivery, actual notification delivery and authenticated live browser flow are still outstanding and must not be described as passed.

## Deployment

The CLI-generated migration was applied to APGI Supabase on 25 September 2026 as `20260925132343_scannex_automated_practical`; its local filename was aligned with the recorded remote version. It is additive and did not update existing assessment rows. Keep live hosting disabled during preview review. The admin editor and readiness workflow need the existing Supabase service-role configuration; a missing migration/configuration produces a visible unavailable message rather than an empty-success state.

The post-migration advisor reported the expected [RLS with no policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) information for these server-only tables. Their browser grants are explicitly revoked. It also reported pre-existing [public security-definer function grants](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated security-definer grants](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Those existing authentication/audit settings were not changed by this migration; the new assessment RPCs are invoker-only and not callable by browser roles.

The AWS embed kit is the official `appstream_embed_1.0.0.zip`; copyright and third-party notices are retained under `public/vendor/aws-appstream`. Next.js was updated to 16.3.6 to resolve the critical advisories reported for the prior 16.3.0 version.

References: [AWS embedded sessions](https://docs.aws.amazon.com/appstream2/latest/developerguide/embed-streaming-sessions.html), [Vercel AWS OIDC](https://vercel.com/docs/oidc/aws), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
