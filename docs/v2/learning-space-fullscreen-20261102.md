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

Deployment and browser evidence will be recorded after release.
