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
- Watchdog unit/regression checks: 67 passed.
- Learner release regression: 987 passed, one pre-existing skip.
- Production dependency audit: zero vulnerabilities.
- Next production build: passed; 210 course videos validated.
- All four existing course fingerprints retained; review and commerce row digests unchanged before release.
- Security advisor no longer reports disabled leaked-password protection. The three existing own-actor role/invitation definer helpers remain deliberately callable; no new public definer function was added. Server-only tables retain RLS with no client policy.

## Still requires separate evidence

This release does not claim exhaustive coverage of policy/certificate records, every server action, all external integrations, provider-wide outbound firewall/DLP, production-only payment/Viewer integrations, independent penetration testing or ISO certification. A real backup must be restored into an approved separate recovery environment and checked for completeness, permissions and recovery time; the small canary exercise is not a substitute. Provider settings were inspected, while rate-limit exhaustion and full browser/inbox recovery remain separate tests. These gaps remain visible in the denominator and specialist report.

Live release identity, runtime result and final preservation checks will be appended after deployment verification.
