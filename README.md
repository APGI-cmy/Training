External V2 observer only.

Hourly read-only checks, no accounts, credentials, dependencies or course assets.
Source: scripts/watchdog-external-observer.mjs on the V2 development branch.
Seven checks include a fixed-origin readiness check for the separate encrypted log receiver.
This detects receiver/disk unavailability, not complete provider log delivery.
Build: node --check watchdog-external-observer.mjs
Tests: node --test archive-observer.test.mjs
Run: node watchdog-external-observer.mjs
Exit 1 means a failed or inconclusive check. Provider notification delivery must be verified separately.
