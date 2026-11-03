# Watchdog recovery and external monitoring — 3 November 2026

This change applies to APGI Training V2 staging. Course content, review decisions,
commercial agreements, learner records and V1 are preserved. The user approves
courses; appointed course reviewers/subject experts review course quality.
“Assessor” remains reserved for learner competency decisions. The separate
security activity is called an **independent security review**.

## Executed recovery exercise

- Approved organisation: APGI-cmy's Org (`gckstwtlnyjrkwynpbdg`).
- Working source: `eaaqgtdpvbxdgjxphjie`.
- Separate target: `guoarsqxmjeqheqsnczg`, APGI-V2-Recovery-2026-11-03.
- Owner approved the provider's US$9.68/month additional recovery-project quote.
- Native backup: 2 November 2026, 07:46:53 UTC. Restore started 3 November,
  06:31:41 UTC. Access verification finished 07:00:32 UTC (09:00:32 SAST).
- 125 tables were restored from the older backup. Fourteen existing, reviewed
  Watchdog/security migrations were rolled forward on the target, using one
  recorded recovery migration. This is deliberately different from replaying the
  migration history as fourteen new production releases.
- All 135 current tables' column, row-security, policy, constraint, index,
  trigger and grant digests matched after roll-forward. Application/private-helper
  function definitions and extension versions matched. 113 complete table-data
  digests matched. Twenty-two account/operational/new-security-history tables had
  expected differences from current source; these were recorded, not silently
  treated as recovered. Review, commercial, learner and certificate data hashes
  matched. A backup restores its recorded recovery point, not later changes.
- Counts after cleanup: 28 accounts, 16 organisations, 12 memberships, three
  review rounds and 16 Storage objects. No synthetic accounts or companies remain.

Storage bytes are not part of the database backup. A separate 3 November snapshot
of all 16 current files (8,149,980 bytes) was encrypted with AES-256-GCM. The key is
protected by Windows CurrentUser DPAPI and the backup directory is restricted to
the current Windows account and SYSTEM. Files were restored from the encrypted
archive, then downloaded and compared by SHA-256. All 16 matched. All ten private
files also rejected anonymous downloads, paired with a successful service read.
Bucket privacy, size limits and MIME restrictions matched the source.

Twenty-one live recovery checks passed: restored configuration, AAL1 owner
denial, synthetic MFA/AAL2, own-profile/member/record positive controls,
same-company/foreign-company denials, six protected-record API boundaries,
anonymous denial, logout revocation and cleanup. Only disposable tagged identities
were used; no real password, authenticator or customer record was used as a probe.

Evidence is retained privately under
`C:/Users/Johan/Codex-Work/watchdog-recovery-20261103`:

| Receipt | SHA-256 |
| --- | --- |
| storage-restore-receipt.json | 13bfdc11e3ac6172d231f6889d918fc02249f5badf92cee350305a6fce1ebee0 |
| recovery-boundary-receipt.json | d01606afab23725d74e299a112437535d828054907586c6110e01a8645fede60 |
| recovery-comparison-after-rollforward.json | cfc12482db21c999f7a786b68cfa6cc9e61bdd797e922e8a33c85f9bef1689c8 |

`recovery-evidence.ts` references this executed, dated drill. It does not turn
editable owner statements into passes and does not repeat a full restore on each
daily run. Evidence requires review/repetition by 3 December 2026. The report
states the backup point, separate file-snapshot date and remaining limitations.

The recovery copy has no connected Git application, database cron, foreign server
or external HTTP trigger. Its Watchdog schedules are disabled. Public signups,
anonymous sign-ins and email sign-in are disabled after testing. Recovery legacy
API-key headers are disabled. No application, email sender, payment, AI or Viewer
integration was repointed. Legacy JWT signature retirement is distinct from
disabling API-key headers and must be verified separately before reuse.

## External observations and notification drill

- Owner approved hourly checks in Render workspace `tea-d6i40e4r85hc739rf2vg`.
- Service: `crn-dbko4vuc6qcc73b0j860`, `apgi-v2-security-observer`.
- Source branch `watchdog-external-monitor`, commit
  `dc8721d494948ca3afd998c7d440439be232839c`. This isolated branch has four small
  files and no course assets, dependencies, credentials or customer content.
  Vercel Git deployment is disabled in that branch only.
- Schedule: `17 * * * *` UTC; smallest 0.5c-512mb compute plan. Provider minimum
  US$1/month, with running-time usage charges. Failure notifications enabled.
- Six read-only checks: known availability marker, paired firewall denial,
  anonymous private-course denial, private API rejection, V2 release identity and
  retained trusted report key. Transport failures and generic login pages do not
  count as successful controls. Redirects are refused and response sizes bounded.
- First external run completed at 06:52:55 UTC, all six checks passed.
- A labelled TEST ALARM deliberately exited with status 1 at 07:08:21 UTC. The
  provider recorded failure; the owner confirmed inbox delivery and supplied the
  received notification screenshot. The normal command was restored and another
  six-check run completed successfully at 07:10:44 UTC.

The Watchdog dashboard links to the protected provider run history. These external
observations are not misrepresented as authenticated/signed receipts from Render
inside the application percentage. Provider-wide log drains, independent archival
retention, stale-heartbeat escalation and DLP coverage are separate work.

## Application and review handover

Suite v5 adds anonymous boundary checks for notifications/inbox/receipts, policy
downloads, certificate downloads and account-security details. These checks do not
replace positive/negative tests across every authenticated record and role.
Earlier signed reports are retained and v5 trends are separate from earlier suites.

An authenticated, scope-checked independent security review brief is available in
the application and as a text download. It defines roles, scope, exclusions,
stop conditions, evidence requirements, recovery review, notification exercises,
remediation and independent retest. It does not appoint/hire a reviewer, authorise
unbounded testing or claim that independent review has already happened.

## Remaining acceptance and controls

- Jorrie privately completes MFA enrolment, as requested by the owner.
- APGI appoints a separate security reviewer and approves the rules of engagement
  and any quote. Course approval and learner competency authority remain separate.
- Agree recovery-time/data-loss objectives; exercise full application cutover and
  integration reconnection in an approved environment. Arrange off-machine key
  escrow and off-site encrypted archive retention. The DPAPI key is tied to this
  Windows account; a file-copy drill is not whole-service disaster acceptance.
- Select an approved external log archive, access/retention policy and budget
  before exporting provider logs. No additional paid log drain or DLP resource
  was activated under the recovery/hourly-check approvals.
- Extend role/record/server-action/browser recovery coverage, review organisational
  risks and supplier controls, and repeat enabled-integration checks before release.

## Local checks

TypeScript and the full application build passed. Watchdog: 127 tests passed.
Learner release: 1,006 passed, one existing skip. Outbound destination audit and
course-media validation passed. Course assets were not staged or regenerated from
the nine pre-existing local line-ending changes. Deployed release verification is
recorded separately after the candidate build and runtime checks finish.

## Provider references

- [Supabase clone project](https://supabase.com/docs/guides/platform/clone-project)
- [Supabase backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Render scheduled-job billing and behaviour](https://render.com/docs/cronjobs)
- [Render compute plans](https://render.com/docs/compute-plans)
- [Supabase log drains](https://supabase.com/docs/guides/observability/log-drains)
- [Vercel Drains](https://vercel.com/docs/drains)
