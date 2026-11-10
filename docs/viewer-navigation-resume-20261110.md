# Viewer navigation and saved learner progress — 10 November 2026

Owner direction: learners may retain an AWS Viewer session while returning to any
learning unit. This replaces the former end-session prerequisite. Authentication,
course enrolment, assessment scoring and certificate conditions are unchanged.

The learner wrapper no longer queries AWS to allow course navigation. The legacy
session endpoint also returns permission to proceed for enrolled authenticated
learners, so previously opened session-check screens can recover.

Learning activities provide course-progress and Viewer-practice links. Viewer
practice preserves a validated same-course return path and provides direct course
progress and last-saved-activity links. Streaming still opens separately. Session
termination instructions apply only when the learner has finished using Viewer.

SCORM changes are saved after changes settle, on commits, periodically when dirty,
on losing focus, and before normal same-tab navigation. Snapshots are captured and
saved in order; failed writes remain retryable. A failed read never becomes an
empty fresh attempt. Oversized resume data is rejected rather than truncated.
Browser crash/offline recovery cannot be guaranteed; visible failed-save feedback
requires the learner to keep the activity open and retry.

The course overview reads learner-owned saved attempts and provides a last-saved
activity route plus saved activity percentages. Activity progress does not confer
a pass or change the existing completion/assessment rules. Stored resume payloads
are not changed by this release; the published course restores its own bookmark.

Prepared from production commit 023e2f13d4f8891c98649bbd1a22eccfe3d0177f in an
isolated external workspace. No course packages, questions or learner records are
rewritten by deployment. Validate on https://training.apgi.app with an enrolled
account: open LU2, advance and save, open Viewer, return without ending it, select
another LU, then resume the saved activity and confirm the restored bookmark.
