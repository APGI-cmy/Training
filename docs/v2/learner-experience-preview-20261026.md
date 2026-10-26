# Learner experience in administrator and assigned-reviewer preview

Administrator preview previously used a simplified course list and a separate
unit page. Review units also used a separate layout. Both now render the learner
`CourseShell` and `UnitViewer`. Public course overviews send an administrator to
the role-gated preview, or an assigned reviewer to their own review preview.
The catalogue and review summary also provide a learner-preview entry.

The shared presentation display includes previous/next learning-unit links,
including in enlarged/full-screen mode. The published package's slide/activity
controls are unchanged. Full-window SCORM activities share `LearningActivity`
across learner, administrator and reviewer routes and retain next/previous links.
Resources, quizzes and the Scannex knowledge-assessment interface use the shared
learner components. Reviewer feedback, current-slide tracking, separate LU
findings, coverage confirmation and the summary/report workflow are retained.

Preview stores opened/completed units and SCORM resume state in this tab's
session storage, scoped by account, course and deployment or review fingerprint.
It never calls the learner SCORM endpoint or records opened-unit/progress events.
The package receives the normal SCORM API so quizzes behave as in learner mode.
The preview-specific knowledge assessment uses the real server scorer behind
administrator/assigned-review access, without inserting a learner attempt.
Restart preview clears only this scoped test state and retains saved findings.

Learner access, publication approval and real completion/assessment checks are
unchanged. Preview neither enrols anyone nor issues a numbered certificate. The
end-of-course preview explains this boundary. Native Scannex practical assessment
remains supervised and assessor-controlled; preview neither launches a practical
assessment/Viewer session nor awards practical marks.

Verification before release:

- All 740 release tests across 73 files and TypeScript pass. Tests cover the actual shared screens,
  in-player/full-window navigation, preview-only routes, access denial, declined
  assignments, isolated accounts/versions/units, real theory scoring without
  persistence and SCORM commits/resume without learner API requests.
- Media verification confirms 82 real MP4 objects. No course package was edited.
- The legacy QA-to-red administrator-containment check passes with the new
  shared preview. That file's separate invitations/enrolments styling assertion
  remains red: it expects the obsolete `page-shell` class in the unchanged
  invitations page, which now uses `admin-page`. This is outside this release.
- The local browser used the actual LU5/LU6 packages with the shared components.
  LU5 advanced to slides 3 and 4 (LA01/LA02). The in-presentation next-unit link
  reached LU6, whose feedback panel identified LU6 with no carried LU5 findings.
  LU6 rendered slide 1 with previous/next links visible in enlarged mode.
- The automated browser intermittently showed an `about:blank` embedded frame.
  The original LU6 package opened correctly; after that availability check, the
  embedded LU6 rendered correctly. No playback success is inferred from the
  earlier blank frames. Live checks remain necessary after deployment.
- The temporary local sample route used no signed-in fixture or save action and
  was removed before release. Its source and screenshots are retained outside
  OneDrive at `C:/Users/Johan/Codex-Work/learner-experience-preview-20261026/`.

V2 staging only. No emails, course publication, commercial acceptance, permission
changes, learner enrolments, grades or certificates are created by this release.
