# Per-LU review workflow — approved design v3

The review modal beside the presentation and the LU workflow read and update the
same finding in `course_review_rounds.document`. There is no copied feedback store.

## User experience

- One entry per LU opens a modal with Initial review, Implementation feedback,
  Reopened rounds and Endorsements navigation. Existing duplicate coverage cards
  and whole-report decision forms are removed from v3 working views.
- The designer's own findings and other reviewers' findings are separate sections.
  Original finding text is edited only beside the presentation by its author.
- Only the assigned designer submits implementation Yes/No and mandatory notes.
  Only the original reviewer accepts or rejects that numbered response. Rejecting
  requires a reason and unlocks the next correction form; saving a private draft
  does not create new implementation notes in any other person's view.
- One different reviewer endorses the completed record, with a reason for No.
  The original author's acceptance checks the fix; peer endorsement checks their
  record. Thus a two-person team can finish without a third person: the designer
  may endorse another person's accepted review record, but never their own finding.
- A declined endorsement is retained, without automatically making the peer
  reviewer responsible for an implementation loop. The finding author may reopen
  their own accepted finding if further corrections are needed.
- Both author decisions and designer submissions are version/response bound.
  Current-version endorsement summaries show all received Yes/No decisions.
- Cross-tab save signals and window focus refresh the shared workflow. Screenshots,
  slide references and course-wide scopes use the existing review storage.

## Preservation and authority

No finding, screenshot, coverage confirmation, report or endorsement is deleted.
Qualified earlier independent correction verification is retained. Earlier reports
remain in history; new v3 documents use per-LU confirmation and per-record
endorsement instead of asking for duplicate full-report approvals. Unchanged-unit
carry-forward evidence remains bound to its approved content transition.

The release activates the workflow on existing open rounds with an atomic,
record-preserving metadata update. It does not register changed course content,
approve commercials, change prices, accept terms, publish a course or affect V1.
Final content clearance and all commercial/branding/publication gates remain.
The database repeats the per-LU gate inside the locked publication transaction.

Only content-review fields are sent to the client modal. Private commercial
schedules and internal cost notes are excluded from that snapshot. New database
helpers use SECURITY INVOKER and grant execute only to service_role (plus owner).

## Verification

- TypeScript and production build pass.
- 845 tests across 87 files pass, including new state machine, server authorization,
  stale-response, two-person completion, client-data isolation and notification tests.
- Ten database publication-gate checks pass in rolled-back fixtures. Missing
  acceptance, self-endorsement, stale responses and missing coverage are rejected.
- Existing open-round snapshots before release are saved outside OneDrive at
  `C:/Users/Johan/Codex-Work/lu-review-workflow-release-20261027/`.
- Database migration applied: `20261027155139_lu_review_workflow`.
- Live deployment and data-preservation verification are recorded below after release.
