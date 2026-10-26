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
