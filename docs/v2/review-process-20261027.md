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
