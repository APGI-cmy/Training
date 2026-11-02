# Full-screen learning space - 2 November 2026

The shared presentation viewport now removes the platform heading, unit links,
routine preview status and explanatory footer in browser full screen. A compact
Exit full screen button remains. The embedded course's own header and Contents,
reading, word-help and tools controls remain intact, as do narration, quizzes and
scene navigation. Leaving full screen restores the page around the same iframe;
the learning session is not restarted. Save errors remain visibly available.

For the supplied Executive Assistant LU1/LU2 packages, the host reduces excess
outer margins and allows introductory videos to use the available width and
height. The host adds only scoped sizing styles after the same-origin frame loads.
It does not alter the course package files, learning data or SCORM save logic.

25 checks passed across presentation controls, learner/reviewer previews, preview
SCORM state and Executive Assistant unit registration. TypeScript passed. Course
fingerprints and review data are to be checked against the current live release
before promotion. Local authenticated development could not be started without
the staging credentials, so browser verification will use the deployed site.

## Release and browser verification

- Final application commit: `8db1b5648c29a24f3afdb3325c200da922528015`.
- Ready deployment: `dpl_A8oNA7kXbac5wQKqnR4A9CDtaKWG`.
- Canonical site: https://training-platform-v2-staging.vercel.app
- Both candidate and canonical deployment endpoints confirmed that source commit.
  All four course fingerprints exactly match the previous live release, including
  Executive Assistant LU1/LU2. No review version change or data reset was requested.
- The final build passed environment isolation, 210 MP4 checks, four course
  manifests, application compilation and TypeScript. The 25 local checks passed
  again after the full-window fallback was made equally compact.
- Authenticated LU2 browser verification showed a single Exit full screen control
  above the unchanged course header. The iframe increased from 662.06 to 861 px
  high at a 1912 x 901 viewport. The video box can now use 1476.5 px width.
- Word help and Tools opened their dialogs; Source reading opened the correct
  reading-book window. Exit restored the page and Enlarge reopened the clean
  layout. The same scene (1 of 35) remained selected throughout.
- Native browser full-screen requests were refused in the automated browser
  session. The full-window fallback is verified and now gives the same clean
  layout. The existing native request/exit handling remains in place.

The layout is shared by learner, administrator and reviewer presentation views.
The authenticated live walkthrough used the administrator preview of LU2; local
checks cover generic presentation and review controls. No learner grades,
enrolments, commercial decisions or publication approvals were changed.

Screenshot: [Updated learning space](qa/learning-space-fullscreen-20261102.png).
Detailed build, archive, identity and browser evidence is saved under
`C:/Users/Johan/Codex-Work/learning-space-20261102/final/`.
