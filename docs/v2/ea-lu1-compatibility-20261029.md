# Executive Assistant LU1 compatibility deployment — 29 October 2026

This release imports the owner's synced `d9923eb8df2e95b80a34d57b1047e39cd1981906`
asset folder `public/courses/Executive Assistant Training Programme` into V2.
It is a private technical pilot, with the existing narration baseline. It does
not open learner enrolment, grant review approval or issue certificates.

- LU1 ZIP SHA256: `106463a98cc7ec0b6101a44e2ec8680bfbc680792d0919c06f18264d3e3564cd`.
- Separate welcome ZIP SHA256: `6a78566b491badad2f88562d175dcd234a5ecfd4886f4adc8326c01a60bbc0fc`.
- All 2,410 synced files match their Git blobs; all 2,366 LU1 manifest references
  resolve. Both ZIP contents match the supplied unpacked bytes. Seventeen MP4s
  are materialized media, stored in ordinary Git by the author's folder-scoped
  attributes; no ZIP is committed and no LFS pointer is served as media.
- The portable course and welcome remain byte-identical. The SCORM launch is
  `course/index.html`; the reading book is `course/ebook.html`.
- Course ID: `executive-assistant-lu1-compatibility`; one LU,
  `ea-lu1-compatibility-unit-1`. The separate welcome is not a second SCO.
- Administrator entry: `/admin/courses/executive-assistant-lu1-compatibility/preview`.
  The preview includes welcome and book controls. Its same-origin welcome frame
  connects Begin to the current administrator/reviewer activity route, retaining
  the platform SCORM parent rather than opening an untracked static LU1 page.
- Application publication blockers remain. Migration
  `20261029155528_ea_lu1_compatibility_pilot.sql` seeds only the new draft course,
  module, LU and client-specific catalogue setting. Verified: zero enrolments
  and zero company offerings; no completion or certificate policy was created.
- The three previous course manifests and the shared engine fingerprint remain
  unchanged. Existing review document hashes and revisions are unchanged.

## Compatibility checks and limits

932 release tests passed (one optional test skipped); TypeScript passed. Seven
pilot checks verify registration, manifest paths, administrator/reviewer welcome
routing, the actual LU1 SCORM adapter with the actual parent preview API,
attempt/draft resume, account isolation and attendance-only/pass separation.
No learner API request occurs during the preview save/resume checks.

The source's proposed shared-player progress-load repair is deliberately not
part of this preview-only import: applying that proposal would change the shared
engine and require re-review of existing courses. No engine compatibility mapping
has been altered to conceal such a change. This pilot is suitable for the
administrator's compatibility test, not authenticated learner-release acceptance.
The source's existing learner-mode gaps (failed-read recovery, synchronous Commit
acknowledgement versus later durable save, and session-time persistence), future
voice edition, live account/database testing and human accessibility/listening
acceptance remain separate work. No native browser acceptance is claimed by the
local simulations. The source authoring review database and screenshots were
not imported; platform feedback uses the normal V2 review workflow if a review
round is created later.

QA and deployment evidence: `C:/Users/Johan/Codex-Work/ea-lu1-deploy-20261029/`.
Hosted build and live verification are appended after deployment.
