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
