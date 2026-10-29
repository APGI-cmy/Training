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

Hosted release and activation evidence will be appended after verification.
