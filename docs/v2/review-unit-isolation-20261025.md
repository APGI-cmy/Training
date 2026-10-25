# Separate review workspaces for learning units

Each LU review now owns its presentation registration, slide reference, feedback
form and new draft. LU navigation opens a new document; the workspace is also
keyed by review round, LU and content version. The slide context carries its LU
identity and accepts a player only when its document belongs to the workspace's
own iframe. Retired callbacks are ignored and new players are not forwarded to
older trackers. Disposing a tracker removes its event listener and does not
restore an older review tracker.

Feedback headings distinguish **Saved feedback for LU6 only** from
**Course-wide findings — all LUs**. Only the LU-specific list supplies the normal
saved-finding selector and reopen prompt. Course-wide findings require explicit
selection to edit and retain their shared discussion/status. They cannot be
converted into a local finding from another LU; the editor offers a new local
finding instead. Current references include the LU, such as **LU6 · Slide 1**.

The current-slide request includes its LU identity. A mismatched LU is rejected
by the server rather than saved against the wrong unit. Existing legacy findings,
screenshots, audit history and deliberate course-wide scope remain intact.

Verification:

- 702 release tests passed; TypeScript passed.
- Regression checks reject a late player registration from a different iframe,
  ignore callbacks after disposal and prevent forwarding to a retired tracker.
- UI checks separate local and shared findings and exclude another LU's local
  records. Action checks reject cross-LU current-slide data and accidental
  conversion of a shared finding into a local one.
- A local browser test used the real LU5 and LU6 iSpring packages. LU5 was moved
  to Slide 4 and given an unsaved draft. Following the LU6 link opened a closed
  feedback panel; opening it showed LU6 · Slide 1, empty comments, cleared
  declarations and zero LU6-local saved findings. The shared finding appeared
  separately. LU6 → LU5 → LU6 repeated the same clean separation.
- The browser test used a temporary local route with sample feedback, no verified
  local account and no save requests. It created no database fixture or email.
  Its source and generated reference were removed before deployment.
- Course packages, SCORM learner playback and review fingerprints were unchanged.

Implementation commit: `504bb6d` on `v2-development`; V2 staging only.

Deployment `dpl_AjaoGKg9bfJP6nzr2a9kMmpK6ZPJ` was verified READY and PROMOTED
on the canonical V2 staging alias with implementation commit `504bb6d`.

An authenticated live check followed LU5 to LU6 with an unsaved LU5 comment.
LU6 opened its own review prompt and a blank new finding, with all declarations
clear. Its lists showed one LU6-only finding and three separately labelled
course-wide findings; no feedback was saved or changed. The automated Edge
tab's embedded player remained blank, so live slide playback was not verified
there. Real-package slide tracking and repeated transitions were verified in
the local browser test described above.

Screenshot evidence: `C:/Users/Johan/Codex-Work/review-unit-isolation-20261025/live-lu6-feedback.jpg`.
