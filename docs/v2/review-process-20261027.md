# Review process working view

- Restores permanent LU links in coverage cards, including when coverage has
  been confirmed or a newer deployed package awaits review registration.
  Viewing stays available; existing save, version and approval gates remain.
- Combines findings, report submission and independent checks in one Review
  process block. The requester sees the team expanded; reviewers see their own
  work first, with other reports available for independent checks.
- Shows each finding once, with discussion, permitted updates and a direct LU
  link. The author's edit link opens that exact saved finding with its original
  reference and values. Course-wide findings retain their course-wide scope.
- The block shows the signed-in user's action notifications and links them to
  the existing numbered references at the required action. Earlier notification
  targets remain valid, including finding/report IDs and section anchors.
- Removes audit events, technical version metadata and duplicated frozen report
  snapshots from this working view. Stored history is not changed or deleted;
  future reporting can use it. Existing coverage, findings, screenshots, report
  versions and endorsements remain intact.
- No database schema, review mutation, notification read/completion logic or
  course content was changed. No review is reopened or correction registered
  by deploying this view, and no reviewer emails are sent.
- TypeScript and 824 tests across 84 files pass. Regression coverage includes
  stale-version navigation, requester/reviewer views, retained old anchors,
  peer identity restrictions, direct finding editing and immutable stored data.
- QA evidence: `C:/Users/Johan/Codex-Work/review-process-20261027/`.

## Live verification

- Application commit `69d6c8591d4cf2cfea887e8d931e47dadd2ab7b9` was deployed
  as `dpl_9USAQn1Y6e3wJqsjFGi3YYDrtYb6`, READY and promoted to the canonical
  V2 alias. All course asset and shared engine fingerprints are unchanged.
- Before/after DOM-backed comparison for the active VPSHR round matched
  exactly: revision 56, registered version `37a1df4f2487`, the same 15 finding
  IDs, two report IDs and both team rows with 13/13 coverage. Both submitted
  reports and their independent endorsements remain displayed as complete.
- All 13 coverage cards retain direct review links. Review process renders
  the requester view, numbered personal notifications, direct action links
  and the same saved responses grouped by reviewer.
- A notification link opened its exact finding and displayed the matching
  numbered reference. An author's saved-finding link opened the LU with its
  feedback panel expanded. No finding, endorsement or coverage form was saved.
- VPSHR already had unregistered content changes before this UI release.
  Its existing submission gate is clearly explained; no correction revision
  was registered and no evidence or coverage was reset to test the controls.
- Ordinary reviewer ordering, own-finding editor values, peer restrictions
  and stale/fresh save gates were verified by the automated fixtures. Another
  reviewer's live account was not impersonated.
- Runtime error/fatal scan returned zero records for 10:01:10-10:06:10 UTC
  (12:01:10-12:06:10 SAST) on 27 October 2026. Browser screenshots and the
  before/after evidence are in the external QA directory.
