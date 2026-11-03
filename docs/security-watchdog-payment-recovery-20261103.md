# V2 payment assurance and application recovery - 3 November 2026

## Implemented

A role-derived payment/personal-information report uses verified, signed, current-deployment evidence. Principals see the platform suite and full report link; company owners can select only companies they own; learners receive a limited allowlisted projection. No actor IDs, customer/company names, raw report or detailed findings are exposed to learners. Unknown, stale, future, invalid-signature, wrong-release and incomplete-cleanup evidence never becomes a pass.

Payment portals explain Stripe-hosted collection, sandbox limitations and named check counts. Actual observed run transitions trigger brief accessible notices with role-appropriate report links. Failed polling does not imply a completed check. The full specialist Watchdog report and its existing downloads remain available to authorised admins.

The daily suite adds actual synthetic checks for approved provider destinations, test-key restrictions, webhook integrity, raw bank/card-field rejection, private setup encryption, personal exports and role-scoped assurance. Live bank/provider acceptance remains explicitly untested in the denominator. This does not claim PCI/ISO certification, individual bank-account verification, 100% security, or absence of historical disclosure.

## Executed recovery evidence

The approved cloud recovery remains separate from working V2. An additional local application exercise restored the encrypted 3 November snapshot into a loopback-only native provider and recovered all application/course assets. The working database and integration endpoints were never repointed.

- 135 table snapshots decrypted and loaded, including 28 accounts, 16 companies, three review rounds and 16 Storage metadata records.
- Pre-runtime row comparison matched 133 tables exactly. Watchdog schedules were deliberately disabled. Native Storage migration IDs/counts matched but its migration-file hash metadata differed with the newer local provider image; this is a documented version difference, not customer data loss.
- Exact hosted application grants on Auth identity columns and private helper schemas were restored. Native TOTP enrol/verify was enabled; real authenticators were not used.
- All 43 application checks passed: fictional-owner MFA, scoped role reports, private payment exports, positive and negative attachment/course access, course byte hashes, restored Storage bytes, revocation and cleanup.
- All 16 encrypted Storage objects were restored and hash checked; test identities/resources were removed.
- Hosted edge configuration, historical application signing secrets, live integrations, approved recovery-time/data-loss objectives, independent human acceptance and a production cutover are separate acceptance work.

Receipts are retained outside OneDrive under `C:/Users/Johan/Codex-Work/watchdog-payment-20261103`. Public evidence contains digests and counts rather than account data.

## Off-site and log archive

The approved OneDrive folder is `C:/Users/Johan/OneDrive/Documents/ChatGPT/Training portal platform/Security backups/2026-11-03`. Database rows were encrypted within PostgreSQL before export. File objects use portable OpenPGP encryption. All database tables and file objects decrypted and verified locally; an exported encrypted private key was imported into a fresh keyring and decrypted a file. OneDrive web visibly shows the database/file snapshots as Private.

The private key/passphrase stay in a restricted external local directory pending the owner's separate password-manager save. No private recovery key is in OneDrive or source control. Cloud-download recovery and the full application archive's cloud arrival need separate evidence; folder visibility is not claimed as a full cloud round trip.

An encrypted metadata snapshot contains 2,010 Supabase events in the bounded 07:00-08:15 UTC window and a 100-request Vercel sample. Identities, IPs, paths, queries, user agents, messages and headers are omitted. This is a bounded metadata snapshot, not continuous complete forensic history.

A separate Render log receiver is prepared with authentication, bounded input/decompression, data minimisation, public-key-only encryption, persisted-ciphertext retry verification and fail-closed disk/error handling. Five tests passed. Paid continuous Supabase/Vercel drains are not activated pending the separately requested cost approval. No complete log-stream or immutable-storage claim is made.

## Standards

- PCI DSS: https://www.pcisecuritystandards.org/standards/pci-dss/
- Outsourcing payment processing does not remove all merchant responsibilities: https://www.pcisecuritystandards.org/faqs/does-pci-dss-apply-to-merchants-who-outsource-all-payment-processing-operations-and-never-store-process-or-transmit-cardholder-data/
- Stripe security integration: https://docs.stripe.com/security/guide
- ISO/IEC 27001: https://www.iso.org/standard/27001

Release/deployment, final signed-suite counts and browser acceptance are appended only after verification.
