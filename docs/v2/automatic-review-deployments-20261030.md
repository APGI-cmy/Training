# Automatic review deployment registration — 30 October 2026

The platform now registers a delivered course revision itself. An authorised
review page attempts registration before evaluating its saving gate; a five-minute
Vercel job supplies background recovery. Changes implemented offers a status retry,
without asking a reviewer for Git references, deployment notes or technical hashes.
Registration is release evidence, never an implementation decision, endorsement,
financial approval, branding approval or publication.

## Source and deployment boundaries

Build-time identities use the actual course registry, unchanged existing course
fingerprints, per-LU definitions and byte digests, remaining shared course files,
and the existing shared-player fingerprint. A deployment may mutate review state
only when its production V2 project ID, provider deployment ID, URL and course
fingerprints match the read-only metadata returned by the canonical V2 address.
An unpromoted candidate, an old deployment, a failed lookup or another project
cannot register content. No deployment/authentication secret is published.

The private, service-role-only registration function locks and compares the old
revision/fingerprint, stores a system release event and queues deduplicated mail
atomically. Repeated jobs/visits are idempotent. Concurrent updates are reloaded;
an old runtime never retries over a newer review record. Existing/manual technical
registration remains server-side for backwards compatibility, with its old checks;
it is no longer a required UI step.

## Evidence preservation

New review rounds include a content identity. Existing same-version rounds receive
a baseline without resetting coverage or mailing anyone. Later content changes
compare LU digests: only affected units lose saved coverage. Shared course/engine
changes and removed units conservatively require a full content recheck. Existing
source-verified exact transitions bootstrap older reviews; unknown older changes
receive no invented exemption.

Findings, discussion, screenshots, implementation rounds, report snapshots and
endorsement history remain stored. Unchanged closed evidence carries explicit
version provenance. Final content clearance is invalidated for changed content;
unchanged monetary sign-offs are retained. Previous combined company acceptance
is archived and needs reconfirmation. Existing seven-day rules and explicit
publication gates remain separate. Registration emails identify changed LUs and
explain rechecking coverage and choosing Yes/No under Endorsements.

The current VPSHR transition `82420476dbb8…` to `ec3b6a49faa2…` is the already
verified LU9 package replacement. The other twelve units retain coverage. Tiger's
older `79ca8ab7e4f1…` identity was independently reproduced from Git commit
`39b56a3e069f539ef7c5a5d522ac7c43b74c41b2`: its packages/catalogue still match,
but ScormPlayer and ScannexTheoryAssessment changed the shared engine from
`9e54cc09ee0e…` to `d92c5ae0944f…`. It consequently needs a full recheck rather
than a fabricated same-version baseline. Its records remain saved.

## Validation before release

- 947 release tests passed; one optional test skipped. TypeScript passed.
- Generated identities match actual runtime review hashes for all four courses.
  The existing package/engine manifest is byte-identical to the previous release.
- Tests cover single-LU/shared/removed-unit changes, verified legacy LU9 scope,
  unknown legacy changes, preview/canonical/project/fingerprint gates, concurrent
  registration and protected scheduled execution.
- Rolled-back SQL tests on V2 verify twelve retained LU coverages, report and
  commercial preservation, retained finding discussion/implementation/endorsement
  records, exact next-LU change detection, system actor, atomic outbox and dedup.
- Both new functions use SECURITY INVOKER with empty search_path. Anonymous and
  authenticated roles have no execute permission; service_role does.

Migration: `20261030081625_automatic_review_deployment_registration.sql`.
QA: `C:/Users/Johan/Codex-Work/automatic-review-deployments-20261030/`.
## Verified live operation

Source commit `6894caf3d883848e01712493e273405c4f4f42d1` built successfully as
`dpl_CTQKrYahxGXGiXktTW5rrp1ExtYH`. Promotion and canonical alias mapping were
verified. Public metadata returned 200 with all four correct course identities;
an anonymous scheduled-job request returned 401. All five scheduled jobs are
configured on the new deployment, including the unchanged four existing jobs.

The real `vercel-cron/1.0` execution at **10:25:40 SAST, 30 October 2026** returned
200 and automatically registered both open content rounds. VPSHR is revision 84,
fingerprint `ec3b6a49faa2…`, with only LU9 reopened and twelve preserved units.
Johan retains twelve coverage confirmations; Jorrie retains eight (his four prior
outstanding units were already unconfirmed). Sixteen findings and two reports
remain saved. Tiger is revision 38 with its older shared-engine change registered;
all eight units need rechecking, with ten findings and one report preserved.

For both rounds, the immediately preceding history snapshot matches the recorded
pre-release document digest. Live SQL comparison confirms reports, commercial
versions, reviewer identities, original finding payloads, discussion, attachments,
implementation rounds and endorsements were retained. Exactly one system release
registration exists per round. Seven release notices were sent, each on its first
attempt: two to the VPSHR team and five to the Tiger team. Provider acceptance is
verified; recipient inbox/opening is not claimed.

The browser test tab was signed out, so no authenticated visual acceptance is
claimed. Live registration, preservation and notification dispatch were verified
through the scheduled execution, database history and outbox instead. The local
migration filename matches the provider-applied version `20261030081625`.
