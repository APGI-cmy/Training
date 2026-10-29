# Seven-day content review response protocol

The owner explicitly authorized this rule for both first content review
invitations and subsequent requests to endorse submitted records or fixes.

## Response and timing

- New V3 review rounds include the rule in the invitation. Existing open rounds
  receive fresh notices; old invitations never start a retroactive clock.
- Each request has a durable, version-specific identity. Seven calendar days
  start at the email outbox's successful-send timestamp. Failed, skipped or
  pending mail cannot start a timer. Resending does not restart a running timer.
- Initial-review nonresponse means no saved finding, discussion reply, coverage
  confirmation or review change request. Partial review is a response and does
  not become an automatic completed initial review. Only platform-recorded
  actions count; reading an email or recording a read receipt does not.
- A later request binds to the exact finding and implementation round. A new
  implementation response requires a new notice/window. Replies, withdrawal,
  rejection, changes or a sufficient endorsement stop obsolete requests.
- The existing hourly course-review worker processes due requests. The cutoff
  and relevant joining-token expiry extend when needed to preserve the full
  seven-day window promised in a successfully sent notice.

## Result and publication boundary

The result is labelled **Deemed endorsement — no response**, with the recipient,
scope, notice time, deadline and system processing time retained. Both reviewer
and requester receive the result. Actual coverage checkboxes, verified-account
identities and human endorsements are not manufactured.

An unanswered first invitation can satisfy that silent reviewer's content
requirement. A timed endorsement can close only the exact eligible submitted
record. Unimplemented findings and rejected responses stay open. A single
eligible explicit or deemed endorsement is sufficient. The designer cannot
endorse their own implementation through a second identity.

Commercial terms, branding, final requester content clearance and publication
remain explicit. No course is automatically published by this worker.

Existing findings, comments, screenshots, reports and endorsements are retained.
The unanimous actual no-findings shortcut remains separate: it requires every
assigned full reviewer to explicitly complete the LU and record no issues.

## Validation and operations

- 922 release tests passed across 96 files; one optional captured-data audit was
  skipped. Type checking and the production build passed.
- Rolled-back database tests cover the earlier LU workflow, clean-review SQL
  parity, sent/failed/pending mail, exact seven-day timing, cutoff extension,
  response cancellation, rejection, exact implementation identity, repeat runs,
  incomplete evidence and private-table/RPC access. Repeated after migration.
- V2-only migrations: `20261029123111_clean_lu_review_publication_parity.sql`
  and `20261029132724_review_nonresponse_endorsements.sql`.
- Request tables/RPCs have no anonymous or authenticated-client access. The
  backend uses its existing private service path. The hourly endpoint retains
  its existing authentication.
- The separately configured operations test executes the same real V2 hourly
  worker only with an explicit environment opt-in and verified V2 project URL.
  It is excluded from ordinary release tests and can send real queued mail.

## Hosted release and activation

- Source release: `10f89d3d0aed3d6ac52f01baa808f354c15e6eba`.
- READY deployment: `dpl_Xe68rukYt4C6GaP3Zf95CuG1BukY`, promoted to
  `https://training-platform-v2-staging.vercel.app`. The canonical alias was
  verified against the V2 project. Hosted compilation, type checking and media
  checks passed; all 85 MP4s were real media rather than LFS pointers.
- Enabled in the two current open V3 rounds (VPSHR and Tiger Kidnapping).
  Cancelled historical reviews were untouched. New rounds enable the rule in
  their invitation automatically.
- Seven policy notices and six grouped request emails reached provider-accepted
  sent state, each with a provider ID. This is not a claim of inbox delivery.
- Nineteen durable timers: four first invitations and fifteen endorsement
  requests. Every deadline is exactly seven days after its successful-send
  timestamp: 5 November 2026, approximately 15:33 SAST. VPSHR's cutoff was
  extended to preserve the full window; Tiger's later cutoff stayed unchanged.
- The real V2 worker completed successfully. A second run sent zero duplicate
  emails and applied zero endorsements. No request was endorsed retroactively.
- Hash comparisons before/after activation preserved the findings, reports,
  participant coverage and workflow/commercial records in all three rounds.
  Only policy, system events and the necessary cutoff extension changed.
- A further 69 read-only designer/reviewer modal checks passed against the
  previously captured review data. This was component/render verification,
  not a live browser test under another person's account.

Local operational evidence is under
`C:/Users/Johan/Codex-Work/review-nonresponse-20261029/` (release/typecheck/build
logs, hosted deployment and alias, notices/timers, preservation and repeat-run
results). No credentials were written into source or release evidence.
