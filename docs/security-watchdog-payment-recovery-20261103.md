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

## Verified release

- Deployed application commit: `ec316fabc0afeba72e4e98490604b87e28392350`.
- Vercel deployment: `dpl_JEFEE3bmvDDVQmu5h27A4rC6ZMct`; canonical `https://training-platform-v2-staging.vercel.app`.
- Signed v6 run: `950c38d4-a5fe-4cba-a49e-e7a090a58369`, completed 09:39:05.973 UTC / 11:39 SAST. 83/88 passed (94% by the dashboard's floor rule); one attention (remaining administrator MFA), four untested broad controls; zero failed/inconclusive; cleanup verified. Ed25519 signature verified against the previously retained trusted key, not a key supplied solely by the report.
- Payment projection has 10 passed named controls out of 11, retaining live bank/provider acceptance as untested.
- The separate hourly Render observer passed all six anonymous external checks against this exact release at 09:39:36.118 UTC; provider recorded successful completion at 09:39:39.890 UTC.
- All four course fingerprints unchanged. A 100-table before/after read confirmed review, learner, commercial and payment data unchanged. Expected monitoring/mail/audit activity is recorded separately; no claim that every operational row was frozen.
- TypeScript and hosted Next build passed; 141 Watchdog tests and the preceding 1,006 learner-release checks passed (one existing skip). Five receiver unit tests plus seven actual container checks passed. The receiver remains unactivated; its follow-up Unix line-ending correction affects the prepared service only, not the deployed Next application.
- Working V2 and separate cloud-recovery security advisors returned no warnings.

The complete source/course archive (18,908 unique files, 6,048,327,706 compressed bytes) was encrypted and its complete decrypted stream matched SHA-256 `cbcf6b8bec77188229c5384146e561dbc8134bb27ea1d7265cabe7585d9e8fba`. A separate encrypted source patch pins the final application version; extract it after the base archive. Provider-managed secrets are outside that source archive.

Still awaiting owner action/evidence: main-admin browser sign-in for visual/download acceptance; separate password-manager recovery-key save; cloud-download recovery; approval before paid continuous log drains. Historical provider/application signing and authenticator-encryption secrets, live integration recovery, agreed recovery objectives and independent human acceptance remain separate. A stopped local recovery copy is isolated; the working system was never repointed.

OneDrive web subsequently confirmed the complete encrypted application archive as Private (5.64 GB), together with the encrypted schema, file objects, source patch and log snapshot. The cloud-download recovery step and separate owner key save remain unverified.
