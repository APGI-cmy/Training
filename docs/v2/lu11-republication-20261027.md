# VPSHR Level 0 LU11 SCORM republication

- Source: Johan's `168758bff4472efc8d5cafc80191ba4ac0bce3e7`
  (`Republishing LU11`) on `main`.
- Archive: `LU 11 Civil unrest-final.zip`, 44,988,050 bytes.
- SHA-256: `b0da863a466be16c52334e93c0e62ba757730b7810f8814f4ff3b0d45232edd4`.
- SCORM version: 2004, 4th Edition; declared launch: `res/index.html`.
- Only this unit's package and eight catalogue asset references changed.
  The package is unpacked with its manifest and original resource layout;
  the former unit entry redirects to the declared SCORM resource.
- The author's package contains three slides, including its embedded quiz.
  Slide 1 has a 547-second timeline and a 545.083-second video. The previous
  65.52-second custom slide timeline is gone.
- Package bytes are retained without rewriting the iSpring player or quizzes.
  The earlier served unit and source archive are kept outside OneDrive in
  `C:/Users/Johan/Codex-Work/lu11-republish-20261027/`.
- TypeScript and 815 release tests across 82 files passed. Tests confirm the
  declared SCORM resource, every manifest asset, full video duration, embedded
  quiz and legacy launch compatibility. The older course identity baseline
  normalizes only this approved LU11 resource move; unrelated fields remain
  protected by its existing hash.
- Build-time course fingerprints are regenerated for this content change.
  No review decisions, commercial terms, learner records or outgoing email
  are modified by this import. Independent correction verification and final
  publication approvals remain separate workflow actions.
- Release and signed-in browser results are recorded in the external QA folder.

## Release verification

- Application commit: `e1250e1ccbdef974beb1f00a73e77507eee0cdd9`.
- V2 deployment: `dpl_4tJQhb6g32b7Tb7bEKFVtniNA5PX`, READY and promoted to
  `https://training-platform-v2-staging.vercel.app`.
- All 119 archive files matched the imported files byte for byte. The live
  entry HTML and SCORM runtime also matched the original package by SHA-256.
- Isolated SCORM preview ran continuously for the complete video. After more
  than 570 seconds, it remained on slide 1 with playback stopped. Clicking Next
  opened slide 2; a second explicit click opened the five-question embedded quiz.
  No quiz answers were submitted and no learner database was used by this test.
- Signed-in platform preview loaded LU11 at its updated SCORM launch path.
  Presentation expansion and video startup worked within the platform player.
- The unrelated Tiger deployed review fingerprint remained `9a757b0a89c0`
  before and after promotion. Its package, course definition and shared player
  sources are unchanged. Scannex package bytes are also unchanged.
- A bounded runtime error/fatal scan returned zero records for 06:21:44-06:26:44
  UTC on 27 October 2026 (08:21:44-08:26:44 SAST).
- Git-based deployment was already blocked by the repository's LFS budget.
  The materialized local release route verified all 82 MP4 files as real media
  both locally and in the hosted prebuild before promotion. No LFS pointers were
  published. The user's original ZIP remains on `main`; this import targets V2.
- No review revision was registered or notified by this deployment. The
  Changes implemented workflow remains the place to register this exact
  correction for independent review; it retains earlier evidence and commercial
  sign-offs and sends the reviewers their updated-version notification.
