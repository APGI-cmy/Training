# Watchdog V3 technical depth — 2 November 2026

## Changes

Direct course-file URLs previously returned course HTML and e-books without sign-in. The V2 Proxy now checks all files under registered course roots, including scripts, images, video, audio and PDFs. A signed user JWT is verified by PostgREST; an own-actor-only RPC checks the live session, verified email, bans/deletion, enrolled MFA and the current admin/enrolment/review relationship. No access decision is cached between requests. Revocation therefore applies to the next request. DAL checks on the course pages remain in place. Private files use `private, no-store` and vary by cookie. The image optimiser is restricted to the public images/branding directories. The single existing Tiger catalogue cover is an exact public exception, not a general image exemption.

The definer lookup lives in a dedicated unexposed schema, with an invoker public wrapper. Ordinary callers cannot supply an actor ID or modify grants. The HTTP fixture RPC is service-role-only and operates only on newly tagged Watchdog users. Its temporary enrolment has no organisation or invitation, so it creates no mail, membership, payment or learner invitation. The attachment is fictional plain text. Cleanup and the interrupted-run sweeper remove both fixture types before removing their users/companies.

The existing fixed-host email adapter now validates exactly one mailbox, rejects recipient-list/header tricks and refuses provider redirects. Privileged database requests accept only the provider's auth, REST and storage paths and also refuse redirects.

## Repeatable live probes

- Anonymous package HEAD requests for all four registered courses.
- Positive enrolled-learner HEAD requests for the Executive course entry, nested script and e-book; forged sign-in, foreign user, revoked enrolment and image-optimiser negative controls.
- A real attachment download by its owner, followed by anonymous, same-company peer and foreign-company denials.
- Empty fictional company CSV export; foreign-company and platform export denials.
- Existing different-scope Watchdog export denial, unenrolled SCORM-write denial, all six unauthenticated cron denials, unsigned webhook denials and off-origin Watchdog-write denial.
- Provider minimum-password and compromised-password rejection, plus one-use synthetic recovery and successful sign-in with a new random password. No external recovery email is sent.

Missing positive controls are not counted as successful denial tests. Unexecuted named checks are inconclusive. The suite identifier is `apgi-watchdog-v3`; trend comparisons only use the same suite and scope. A percentage represents passed named checks, not a probability that the platform is secure. Previous signed reports are unchanged.

## Provider changes

In the existing Pro V2 branch, enabled leaked-password protection and secure password changes and raised the provider minimum from six to twelve characters, matching the application. Secure email changes and confirmed-email sign-up were already enabled; anonymous sign-in and manual linking were disabled. Provider rate limits were inspected without a burst/load test against the shared service. No paid upgrade or V1 setting was changed.

Johan's verified TOTP enrolment was confirmed. Jorrie had no verified factor at the time of inspection and was sent an Outlook reminder with the private enrolment instructions. Each real administrator must complete their own enrolment.

## Local verification

- TypeScript: passed.
- Watchdog unit/regression checks: 70 passed.
- Learner release regression: 987 passed, one pre-existing skip.
- Production dependency audit: zero vulnerabilities.
- Next production build: passed; 210 course videos validated.
- All four existing course fingerprints retained; review and commerce row digests unchanged before release.
- Security advisor no longer reports disabled leaked-password protection. The three existing own-actor role/invitation definer helpers remain deliberately callable; no new public definer function was added. Server-only tables retain RLS with no client policy.

## Still requires separate evidence

This release does not claim exhaustive coverage of policy/certificate records, every server action, all external integrations, provider-wide outbound firewall/DLP, production-only payment/Viewer integrations, independent penetration testing or ISO certification. A real backup must be restored into an approved separate recovery environment and checked for completeness, permissions and recovery time; the small canary exercise is not a substitute. Provider settings were inspected, while rate-limit exhaustion and full browser/inbox recovery remain separate tests. These gaps remain visible in the denominator and specialist report.

## Live release verified

- Vercel deployment: `dpl_GgGJAMqvApCih4dPYNNhc1q6gvMo`.
- Deployed application commit: `4b69ba9d4823efcdb001cf0543fa5a58e1c9dafb`.
- Canonical V2 address: https://training-platform-v2-staging.vercel.app.
- Current signed run: `5a55a1a1-741d-47e1-8a4a-881060992182`, completed 2 November 2026, 16:20 SAST.
- **61/67 named checks passed (91%)**, zero failed, zero inconclusive, one attention item (one of the two principals still needs their own verified authenticator), five explicit untested areas.
- All 22 new HTTP checks and the three provider password/recovery probes passed. Revoked synthetic enrolment lost access to the previously successful course-file URL.
- Daily/changed-deployment monitoring completed the new run. The manual and automatic paths use the same runner. The database mutex, scheduler claim and interrupted-run sweeper now share a ten-minute stale-run window; request execution is capped at five minutes.
- Final temporary identities, enrolments, message threads, canaries and storage objects: **all zero**. Real totals remain 28 users, 16 companies and 12 memberships.
- Review rounds: three, unchanged digest `805c8c58104260ad5042deb61e10c9c2`; commerce settings: two, unchanged digest `21ed13ec61b393c9db9e8f3236a18fb4`.
- Existing four course fingerprints match the previous release. No course package or review data was committed or reset.
- Authenticated administrator browser opened the protected e-book and direct learning controls. The separate embedded-player check still showed a blank iframe in this automated browser, as observed in earlier platform testing; full embedded playback is not claimed as accepted by this security release.
- PDF and signed JSON downloaded successfully in Edge. The JSON signature verified independently against retained trusted key `a08bdf54532bf8c3b4ab6932`. All six PDF pages were rendered and inspected; body text stays clear of the footer.
- Earlier interrupted/failed test runs remain retained: the first fixture insert omitted the required message UUID; the second read the SDK error field instead of GoTrue's raw `error_code`. Both test defects were corrected and retested. The final password probes require the specific `length` and `pwned` rejection reasons, rather than treating any error as protection.

Downloadable evidence is available in the live Watchdog dashboard. Local QA and downloaded copies are under `C:/Users/Johan/Codex-Work/watchdog-depth-20261102`; originals remain in Downloads. The final application source is committed and pushed to `v2-development`; this evidence-only documentation update does not require a new application deployment.

## Recovery preparation and retained advisories

The V2 provider dashboard lists daily physical backups from 26 October through 2 November; the latest observed is 2 November 2026, 07:46:53 UTC. It explicitly excludes Storage object contents. Database `pg_cron` is not enabled; application schedules are on Vercel. A full recovery drill must use a separate approved environment, keep app/email/payment integrations disconnected, restore the selected backup and independently recover/verify private Storage files. No paid recovery project was created and no existing project was restored in place.

The final provider advisor has no disabled-leaked-password warning. Its remaining three callable definer helpers are existing own-actor role/invitation lookups; the new asset helper is outside the exposed API schema. The 74 RLS/no-policy notices refer to deliberately server-only tables with no ordinary client access. References: [definer helper review](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS/no-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [provider password controls](https://supabase.com/docs/guides/auth/password-security).
