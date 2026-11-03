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

The private key/passphrase stay in a restricted external local directory. The owner confirmed saving and reopening the complete package in Bitdefender SecurePass; the helper recorded confirmation at 11:07:14.788 UTC on 3 November. No private recovery key is in OneDrive or source control. Cloud-download recovery needs separate evidence; folder visibility is not claimed as a full cloud round trip.

An encrypted metadata snapshot contains 2,010 Supabase events in the bounded 07:00-08:15 UTC window and a 100-request Vercel sample. Identities, IPs, paths, queries, user agents, messages and headers are omitted. This is a bounded metadata snapshot, not continuous complete forensic history.

A separate Render log receiver is live following the owner's stated cost/data-routing approval. It has separate provider authentication, Vercel HMAC verification, bounded input/decompression, allowlisted metadata, public-key-only encryption, durable writes and integrity-checked encrypted owner export. Eight unit tests and nine live checks passed. Downloaded remote ciphertext decrypted correctly with personal/message fields absent, and the same digest survived a disk-backed redeployment.

Receiver `srv-dbks0795efls73fgiuu0` uses the dedicated `watchdog-log-archive` branch, commit `6a0b875c8297d30623acd8002c753463e36bf6c9`. Disk `dsk-dbks263bc2fs73a7890g` is 5 GB mounted at `/var/data`; compute/disk base cost is $8.25/month, within the approved $10/month limit, excluding taxes/usage. Its private recovery key is not present on Render. `/health` readiness is monitored separately from proof of delivery.

Vercel drain `drn_cFkS3JC8u0uWxE87` is enabled for V2 project `prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf` only, covering preview and production logs. Provider test delivery returned success/200. Current drain price was checked as $0.50/GB of uncompressed JSON before activation. Supabase's V2 custom-endpoint form is prepared at the approved $60/month plus $0.20/million events and $0.09/GB egress; the new private Authorization header and submission require owner handoff and are not yet claimed active.

Downloaded encrypted batches were hash checked, decrypted in memory, verified against the allowlisted schema and mirrored under the approved OneDrive `continuous-logs` subfolder. This verifies the remote receiver download and local synced copy, not a OneDrive cloud-download round trip. The mirror is currently on demand, not scheduled. Storage is not immutable and no lossless/complete forensic-history claim is made.

The separate hourly observer update `f9383f5c7b7fdc7bfeba12140b6edc77928ac116` adds fixed-origin archive readiness to the existing six checks. All seven local live observations and four new standalone negative/health tests passed. Ten application observer tests and all 142 Watchdog tests passed. Render deployed this observer update as `dep-dbks7r7b9u1s738a4ou0`; first hosted seven-check execution is still pending verification. This operations-only update does not require a new Next application deployment or course registration.

Main-admin browser acceptance of the payment assurance report was completed earlier this session: 10/11 named payment controls and the current signed-run date were displayed. The owner continues live platform testing. Existing course content, review, learner and commercial records were not reset by these operations changes.

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

Still awaiting evidence: Supabase log connection handoff/first live delivery; first hosted seven-check observer run; OneDrive cloud-download recovery. Historical provider/application signing and authenticator-encryption secrets, live integration recovery, agreed recovery objectives and independent human security review remain separate. A stopped local recovery copy is isolated; the working system was never repointed. The local suite's percentage is not increased merely because these operations tasks were performed.

OneDrive web subsequently confirmed the complete encrypted application archive as Private (5.64 GB), together with the encrypted schema, file objects, source patch and log snapshot. The cloud-download recovery step remains unverified; separate owner key save is now confirmed.
