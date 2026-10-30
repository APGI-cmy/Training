# Course summary and LU workflow alignment — 30 October 2026

The existing course-level correction panel still counted submitted responses as
unfinished correction work until their endorsement. That contradicted the agreed
LU process: implementation submission completes the designer's work; Yes closes
the record, while No and a reason reopen it for the next response.

## Resulting behaviour

- V3 Step 3 is named **Changes implemented** on both the course sidebar and panel.
  It completes when every required implementation response is recorded and no
  correction is currently reopened. A pending endorsement does not keep it red.
- Step 2, **Content review and endorsements**, remains incomplete until the actual
  team initial reviews and required endorsements are complete. Each LU child uses
  the same four-stage status functions as its modal. No duplicate report decision
  or legacy fixed/verified field requirement is introduced.
- A shared progress projection uses the existing modal predicates. Counts separate
  initial reviews, submitted responses, reopened work, awaiting endorsements and
  closed records. Missing coverage and missing saved feedback declarations are
  named separately, with direct links into the affected LU.
- The corrections panel lists every actionable finding, not only the four legacy
  blocking flags. Each status opens the exact same finding in its LU workspace.
  A submitted explanation declining a suggested change still requires endorsement.
- The deadline table uses exact current request keys, response versions, successful
  notice times and stored deadlines. It does not infer approval from the clock,
  email reading, a status flag or an older response. A recorded response that stops
  a timer is distinguished from an outstanding endorsement decision.
- The existing canonical-proof-gated five-minute job also reconciles response
  requests after saved feedback. It reuses matching policy notices and never
  restarts successfully notified requests. Due results remain processed hourly by
  the established seven-day rule. Unimplemented work, financial/branding decisions
  and publication do not become approved through this change.

No migration, package import, review reset, content registration or approval is
required by this release. Course packages, shared player source and review
fingerprints are unchanged. Existing immutable snapshots and records are retained.

## Live source audit before release

VPSHR round `4e26a845-4c1e-442a-87f8-2ad192647b37`, revision 93:

- Eight required implementation responses are submitted; none requires another
  designer response at this snapshot.
- Fifteen active records await endorsement, three are closed and three no-change
  declarations await the rest of the initial review team.
- Two of thirteen LUs have fully completed team initial reviews. Johan has all
  thirteen coverage confirmations, but LU10 has no saved feedback declaration.
  Jorrie has eight coverage confirmations; five remain unconfirmed, and several
  LUs still need his saved feedback declaration. These gaps are not fabricated
  away or treated as implementation defects.
- Eleven current endorsement request keys have existing pending timers; four
  newer eligible requests are not yet linked. Background reconciliation supplies
  their notice linkage or delivery without resetting the eleven existing timers.

QA evidence is under
`C:/Users/Johan/Codex-Work/review-summary-alignment-20261030/`.
TypeScript passed. The release suite passed 959 tests with one optional skip;
an additional closed-review regression check was then added and passed in the
targeted workflow suite. Coverage includes 2/5 reviewers, submission/endorsement
separation, No/reopen/next response, explicit closure, clean-review waiver,
missing confirmations, stale deployments, exact deadline binding, stopped timers,
tracking visibility and overdue-without-deemed-result behaviour.

## Verified live release

Source `0480834c2d44b45e39671d0ce075774a643ee28a` built successfully as
`dpl_BmxTMZUk82GADo1KfGyyt5mjzyFb`. Candidate and canonical public metadata were
verified against all four previous course identities: every fingerprint remains
unchanged. The canonical alias points to the new deployment. Anonymous job calls
return 401; the five existing schedules remain configured.

The authenticated Johan browser view was refreshed and inspected. Both sidebar
Step 3 and the Changes implemented panel report Complete, with 8/8 implementation
responses submitted, zero open/reopened corrections and 15 awaiting endorsements.
Step 2 remains incomplete. The real deadline table was expanded and checked;
after background reconciliation, all fifteen entries have successful notice dates
and deadlines. No request remains labelled awaiting delivery. Native screenshot:
`C:/Users/Johan/Codex-Work/review-summary-alignment-20261030/live-changes-implemented.png`.
Other users were not impersonated; reviewer cases are covered by the shared
projection and the multi-reviewer regression tests.

The background run at 11:55 SAST linked the four newer requests and successfully
sent one grouped notice to Jorrie at **11:55:43 SAST on 30 October 2026**. Their
deadline is **11:55:43 SAST on 6 November 2026**. Existing current request deadlines
remain **15:33 SAST on 5 November 2026**. SQL comparison against the pre-release
request snapshot confirms every already-notified request retains its original
notice/deadline timestamps. Provider sending acceptance is verified, not inbox
delivery or reading.

VPSHR remains revision 93, fingerprint `ec3b6a49faa2…`. Exact JSON digests confirm
that findings (including responses and endorsements), participants/coverage,
reports and commercial versions remain unchanged. No review data was reset and
no human decision was supplied by this release.
