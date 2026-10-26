# VPSHR quizzes and completion on Next

VPSHR's thirteen platform-generated quiz arrays are empty. The original published
learning units and their internal quizzes are unchanged. The legacy responsive
VPSHR page also omits the platform quiz and manual progress panel.

The shared learner/administrator/reviewer unit view keeps Previous and Next in
the existing navigation positions and inside the enlarged presentation. For
VPSHR's web-export units, Next records the current unit completed before opening
the next one. Finish records the final unit and returns to the course home.
The separate Mark unit complete button is omitted. Completed units remain
accessible; revisiting does not downgrade completion or replace its original
completion date.

The learner action authenticates the session, confirms course access and
derives the next unit from the server's course definition. It cannot be used for
another course, a SCORM result, practical marks or a supplied redirect. It waits
for event/unit/course progress persistence before setting the progress cookie
and redirecting. An unavailable read or failed write leaves the person on the
current unit with a retry message. This stricter mode is opt-in; existing SCORM
completion paths retain their scoring rules.

Preview Next updates only the account/course/version's tab-local test progress;
it does not invoke the learner completion action or confirm review coverage.
The old public legacy page continues to use browser-local progress only.
Reviewer findings, coverage confirmations, endorsements and publication approvals
are separate and are not automatically submitted. No emails are sent.

Verification: 758 release tests across 75 files and TypeScript pass. New checks
cover all thirteen empty quiz arrays; unchanged VPSHR metadata/assets outside
the quiz properties; shared navigation without the manual button; learner access
denial; server-derived next/final destinations; failed persistence/read handling;
preservation on revisit; and rejection of this completion action for Scannex or
Tiger Kidnapping. Scannex's exact catalogue identity remains unchanged.

The VPSHR course definition changes its review fingerprint normally. Existing
evidence is retained and version-registration/approval checks remain in place.
No review correction is registered automatically. QA evidence is kept outside
OneDrive under `C:/Users/Johan/Codex-Work/vpshr-next-completion-20261026/`.

## Deployment and signed-in verification

Implementation `febcd5f44a1e02a37d165ce2abcca1783d2182f7` was verified READY and
PROMOTED as deployment `dpl_FdAd6QKtRg5qSXE6ewkigBkYXwM2`. The canonical V2
staging alias was checked against that exact deployment in project
`prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf`.

The signed-in Edge preview opened orientation, advanced to LU1, then used the
bottom Next control to open LU2. Returning through Previous opened LU1 with
Completed status. LU2's visible layout retained Previous: Definition of Human
Rights and Next: Benefits of Human Rights, directly after the published unit
and Open expanded unit link. No platform knowledge check or Mark unit complete
control was present. This browser check exercised preview test state, without
writing actual learner grades or enrolments.

Read-only V2 schema inspection confirmed the three existing progress tables,
their expected columns, enabled row-level security and write checks against
`auth.uid()`. No schema, policy or access grant was changed. Real learner
persistence and failure handling were tested through the authenticated action
and progress-service regression checks; no real learner completion fixture was
inserted. The final runtime scan returned zero error/fatal records for
09:19:29–09:29:29 UTC on 26 October 2026 (11:19:29–11:29:29 SAST).

Screenshots: `live-navigation-no-extra-quiz.jpg` and
`live-completed-unit-revisited.jpg` in the QA folder above. The automated browser
still showed a blank embedded player, so no new playback claim is made; the
published media and internal quizzes were not edited.
