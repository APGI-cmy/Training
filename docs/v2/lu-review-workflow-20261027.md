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
- 847 tests across 87 files pass, including new state machine, server authorization,
  stale-response, two-person completion, client-data isolation and notification tests.
- Ten database publication-gate checks pass in rolled-back fixtures. Missing
  acceptance, self-endorsement, stale responses and missing coverage are rejected.
- Existing open-round snapshots before release are saved outside OneDrive at
  `C:/Users/Johan/Codex-Work/lu-review-workflow-release-20261027/`.
- Database migration applied: `20261027155139_lu_review_workflow`.
- Live deployment and data-preservation verification are recorded below after release.

## Released on 27 October 2026

Application commit: `405232fad5fa83e9d87d42e5c2281aa4520810ec`.
Database migration: `20261027155139_lu_review_workflow`.

The existing VPSHR round was enabled at revision 62, retaining all 16 findings and
both earlier reports. The Tiger round was enabled at revision 32, retaining all
10 findings and its earlier report. Before/after comparisons confirm that findings,
reports, participants and coverage, course fingerprints and commercial schedules
are unchanged by activation. No reviewer data was reset and no email was sent by
that metadata transition.

Signed-in browser verification passed on the live V2 site: one LU entry, all four
modal stages, saved author and other-reviewer records, current notification links
to the exact finding, the presentation-side editor opening the same saved finding,
and no premature reopened implementation notes. Visual inspection found no modal
layout overlaps. No fabricated finding, implementation response, acceptance,
endorsement, commercial decision or publication was submitted to live records.
A final return-link adjustment uses a full page navigation so the exact LU anchor
opens reliably after returning from the presentation. TypeScript passed again.

The automated suite passed 847 tests across 87 files, plus ten database gate checks
inside rolled-back fixtures. Those tests exercise submissions and rejection loops;
the live walkthrough was read only. The presentation iframe was blank in the
agent's browser session, so this release does not claim course-media playback QA.
Sources remain in their original locations; release caches are outside OneDrive.
Final deployment: `dpl_9YbcWfsooJAXABbwqxfHgJjH5Fpb` (READY),
`training-platform-v2-staging-bzbaki8a5-rassie-ras-projects.vercel.app`.
The canonical alias `training-platform-v2-staging.vercel.app` was promoted and
independently resolved to that deployment and the existing V2 project. Production
build, environment isolation, course manifests and all 82 real-media checks passed.
No dependency links or junctions were introduced into the synced source projects.
Post-promotion signed-in check confirmed that Return to this LU workflow now
opens the exact Introduction modal at its Initial review stage. The saved finding
editor also displays the updated shared-record explanation. Runtime error/fatal
log scan returned zero records for 16:26:48–16:31:48 UTC on the final deployment.