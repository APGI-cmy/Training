# Email preview approval and review-team resends

The editor now follows Preview email → Accept preview → Save draft → Use this
design for review invitations (or Activate saved email for other message rules).
Acceptance confirms the message, image, audience, timing and recipient permissions.
It does not send or activate an email. Editing invalidates the displayed preview
and acceptance. Saving an active email retains the existing pause-before-enable
behaviour.

Server-signed approval receipts bind the verified actor, company, message set,
entry, revision, name, design and delivery rule. Receipts expire after two hours.
Saving needs a matching preview receipt and explicit acceptance; activation needs
the receipt for the resulting saved revision. Approval survives the save refresh
within the open workbench. Reopening the workbench requires the sequence again.
No database schema or access policies changed.

The Review team section now displays the invitation design and exposes a bulk
resend button plus individual reviewer resends. Only platform principals may
request resends. Recipients must be assigned and unfinished, and must not have
declined. The review must be open, within its cutoff and match deployed content.
A matching saved draft blocks standard-template substitution until enabled.

Each recipient receives a separate invitation with their own joining token and
assigned tasks. The existing revision-controlled review commit, durable mail
queue, frozen invitation snapshot and provider idempotency remain in use.
Provider acceptance is distinguished from inbox delivery or reading. Resends
preserve reports, coverage, findings and approvals.

NKS reviews resolve NKS's enabled course-specific design (or its general company
design). APGI's separate drafts are not silently substituted. Enabling a design
does not send messages; the resend action is separate.

## Checks before release

- Type checking passed.
- Production build passed.
- Learner release suite: 656 tests in 65 files passed.
- All 82 course MP4s verified as actual media objects, rather than LFS pointers.
- Approval tests cover acceptance, save-to-enable revision binding, edited
  content, forged signatures, expiry, and cross-actor/company/set/entry reuse.
- Resend tests cover bulk and individual routing, distinct private joining links,
  unchanged reviewer progress, authority, disabled designs, stale/overdue/closed
  reviews, arbitrary addresses and completed/declined participants.
- Existing APGI and NKS drafts were read without alteration. Before this release,
  APGI's invitation was draft version 3 and NKS's was draft version 4. Five
  historical invitations remained recorded for the NKS Tiger review.
- No new invitations were sent during automated verification.

Live browser verification requires the user's signed-in session; the available
APGI browser redirected to sign-in during the release checks.

## Release

Functional commit `c06fec5d95b45c6771514670d5643b48cf22bd61` was built and promoted
on V2 only. Deployment `dpl_aw1qBAhoo6yhvxKXTpJqSTtW8xyh` is READY / PROMOTED at
`https://training-platform-v2-staging.vercel.app`; the alias was checked against
that deployment and commit. Final database reads still showed APGI draft version
3, NKS draft version 4, and the original five sent invitation records. No designs
were enabled or invitations resent by this release verification.

The post-promotion error-log query returned zero error records for this deployment
in its first ten-minute query window. This is a narrow release check, not evidence
of an authenticated editor/save or actual resend delivery: browser authentication
was unavailable, and no external recipients were contacted.
