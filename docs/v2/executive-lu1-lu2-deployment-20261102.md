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
documented --archive=tgz convention: the committed Executive course subtree is
packed into `.vercel/source.tgz.partN` objects; unchanged application and course
objects reuse the previous deployment references. The build extracts the supplied
files, then runs the normal media and course-identity checks. Source content stays
in Git in unpacked form; no ZIP or generated large archive is committed.

QA and reproducible packaging/upload scripts are in
`C:/Users/Johan/Codex-Work/ea-lu1-lu2-20261102/`. All temporary authoring/dependency
links are outside OneDrive. Local GitHub Desktop and the other worktree's pending
course edits are preserved. No Supabase review round exists for this private
course as of the pre-deployment read-only check.

Hosted build, alias, content checks and authenticated preview results will be
recorded after release. Local checks do not establish learner or owner acceptance.
