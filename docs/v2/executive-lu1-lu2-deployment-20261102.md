# Executive Assistant LU1/LU2 private preview deployment — 2 November 2026

The user supplied commit `4b9ca9272577163f3890d25b98a1a51937e5369f` (EA training)
on the source Training repository's main branch and requested updated LU1 plus
new LU2 on V2 staging. The V2 application branch is preserved separately.

- Updated LU1 is edition `0.18-scene-visibility-six-voices`, candidate fingerprint
  `ca713248c445db6d3cf3276c7d4cc65c0e0172fe57a1229a20d2e834acfcb409`.
- New LU2 is Professional boundaries, ethics and limits of authority, fingerprint
  `ecd4fa8a6bce2e5a233d8ae2098ae41e738aa2aa8c6806485034e58ff3c9dd04`.
- Both are registered under the existing stable course ID
  `executive-assistant-lu1-compatibility`, with stable LU1 ID and added LU2 ID.
  Their launch/book paths use the supplied LU1/course and LU2/course directories.
  The separate welcome uses LU1/introduction. Normal platform next/previous unit
  navigation links the two units; no duplicate platform quiz is added.
- The course remains client-specific and a private compatibility preview. No
  enrolment, offering, certificate, financial approval or publication is created.
  Owner, independent, human-listening and learner acceptance remain separate.

All 10,306 imported files match the source working packages byte for byte. LU1
contains 9,118 files and 9,114 declared SCORM references; LU2 contains 1,188 files
and 1,184 references. Both manifests specify SCORM 2004 4th Edition and launch
course/index.html. All declared resources exist and no Git LFS pointer is served
instead of a binary. Original source files were not edited.

30 integration checks passed across the real LU1 adapter, two-unit registration,
reading resources, welcome context, preview resume and account/unit isolation,
platform preview navigation and SCORM endpoints. TypeScript passed.

## Deployment packaging

The expanded course would exceed Vercel's 15,000 source-file limit together with
the existing application/course files. The deployment therefore uses Vercel CLI's
documented --archive=tgz convention. All application files, unchanged course
files and both updated Executive units are included in 289 archive parts named
`.vercel/source.tgz.partN`. The reconstructed archive was checked against all
18,791 expected files, including package.json and package-lock.json. Unchanged
course objects were checked against the previous deployment's exact file hashes.
The build then runs the normal media and course-identity checks. Source content
stays in Git in unpacked form; no ZIP or generated large archive is committed.

The first candidate, `dpl_VFofrtyhhEUPBACWaBtQtmNJTwme`, failed before installation
because combining archive parts with ordinary file references did not preserve
the application files during extraction. It was never promoted. The corrected
candidate includes everything in the archive and keeps automatic alias assignment
disabled until its build and deployment identity are checked.

QA and reproducible packaging/upload scripts are in
`C:/Users/Johan/Codex-Work/ea-lu1-lu2-20261102/`. All temporary authoring/dependency
links are outside OneDrive. Local GitHub Desktop and the other worktree's pending
course edits are preserved. No Supabase review round exists for this private
course as of the pre-deployment read-only check.

## Hosted release evidence

- Source commit: `7901fa353ba6d4191bff1b0662b099112cee4d19` on v2-development.
- Successful deployment: `dpl_6W1D1QTtTeKuYk4g8FM1Bu33ZZZh`, READY.
- Candidate: https://training-platform-v2-staging-l8v8v1963-rassie-ras-projects.vercel.app
- Promoted canonical site: https://training-platform-v2-staging.vercel.app
- Both the Vercel alias record and the canonical course-deployment endpoint
  confirm that deployment and source commit.
- Executive course fingerprint:
  `a4a95393fc137092eafcc4a9e1f61f3beea3bc00d6221a4e9e40cf65848ec43b`.
- VPSHR, Scannex and Tiger Kidnapping fingerprints exactly match the previous
  live deployment. Their review content versions were not changed by this release.
- Hosted checks passed: 17 complete resource hash comparisons, byte-range checks
  for all 125 video objects, 12 narrator audio samples, two PDF resources, and
  unauthenticated learner-state requests denied for both units: 158 checks total.
- The hosted build verified V2 environment isolation, all 210 platform MP4 media
  objects and four course review manifests, then compiled and passed TypeScript.

Administrator preview:
https://training-platform-v2-staging.vercel.app/admin/courses/executive-assistant-lu1-compatibility/preview

The administrator preview requires the user's APGI sign-in. That authenticated
browser check was not completed; sign-in remains required and the selected Edge
browser became unavailable. No password was read or entered. Hosted resource and
local integration checks do not establish owner, human-listening, representative
learner, authenticated platform-state or certificate acceptance.

Evidence is saved as full-archive-verification.json, full-deployment-state.json,
full-build.log, candidate-status.json, live-alias.json, live-status.json and
hosted-verification.json in the external QA directory above. No review records
were reset and no course was published for learner enrolment.
