External V2 observer only.

Hourly read-only checks, no accounts, credentials, dependencies or course assets.
Source: scripts/watchdog-external-observer.mjs on the V2 development branch.
Seven checks include a fixed-origin readiness check for the separate encrypted log receiver.
This detects receiver/disk unavailability, not complete provider log delivery.
Build: node --check watchdog-external-observer.mjs
Tests: node --test archive-observer.test.mjs
Run: node watchdog-external-observer.mjs
Exit 1 means a failed or inconclusive check. Provider notification delivery must be verified separately.


Archive monitoring update (16 November 2026): the archive check now requires
version 2 health, a recent successful encryption/commit/read-back probe, and both
byte and inode use below 75%. A shallow ready response no longer passes. The
check prints only safe capacity percentages and status labels. Run
`node --test archive-monitor.test.mjs` to verify early warnings, stale probes,
failed encryption and the bounded warning drill. The existing hourly cron job
and its configured failure notifications remain in use. Other V2 checks are
preserved; a separate release-identity failure must not be mistaken for an
archive failure.
