# VPSHR LU9 Role of Security republication

The author requested deployment of the replacement export at
`C:/Users/Johan/OneDrive/Documents/GitHub/Training/public/courses/vpshr-level-0/LU9 Role-of-security/10. The role of security.zip`.
The earlier main-branch commit `19a28044268da18b01c0988f9269e3b1a8bb9e78`
contains only removal of the prior package. The replacement ZIP is ignored by
Git and was imported from the supplied local file, without merging main into V2.

## Package and launch

- Source ZIP: 2,104,062,121 bytes, SHA256
  `0450f2fe370805db5cf8c0892b2e861e1becaca87bfe0cac50be53edcf2a14b0`.
- SCORM 2004, 4th Edition, resource `res/index.html`.
- All 1,183 archive files passed streaming integrity/hash checks. All 1,155
  manifest-declared references resolve. There are 44 authored slides, 16 embedded
  quizzes and 10 interactions. The 36 exported MP4 objects match media hashes
  already present in the previous served package. No media was re-encoded.
- Seven LU9 catalogue asset references now use `res/`. The former root entry
  redirects while preserving query and fragment. The course continues to use
  its embedded quizzes; duplicate platform quizzes are not restored.
- Original ZIP and prior served LU9 are retained under
  `C:/Users/Johan/Codex-Work/lu9-republish-20261029/`, along with the reproducible
  import/scope scripts and QA evidence. The supplied source ZIP remains in place.
- Vendor text bytes are preserved with an exact LU9 `.gitattributes` rule.
  MP4s retain Git LFS storage and are materialized before deployment.

## Review preservation

The exact verified content transition is from
`82420476dbb8d3855b681a8ce7f507268c0348ba79e47c4f20542cb907aeb8b4`
to `ec3b6a49faa2949ca97d55db2475d3954db3f2ac80a67748d905be3783d3bff5`.
Only LU9 definitions and files changed. The other twelve LUs, Scannex, Tiger and
the shared playback engine are unchanged.

Application and private database scope rules select only LU9 when the corrected
version is registered. A rolled-back test of the actual review round confirmed
retention of all other coverage, reports, findings, replies, screenshots,
implementation rounds, endorsements, commercial records and response policy.
Unknown transitions continue to require full recheck. No actual correction
registration, reviewer decision, email, learner record or publication approval
is performed by this package import.

Applied migration: `20261029145323_lu9_scorm_correction_scope.sql`.
925 release tests and TypeScript passed. Local/hosted build, deployment and served
asset checks are recorded below after verification.


## Completed deployment and served verification

- Source release: `4ee77c02edee9619e54faf509aea748551d431f1`, pushed to
  `v2-development`.
- Vercel V2 project: `prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf` in team
  `team_KOQzed54bA9hTgta0YarblZq`.
- Deployment: `dpl_jo43b8xRdY7CZN6p78t857EsELMx`, production target, READY.
  Built as a staged production candidate with automatic domain assignment off,
  then promoted to `https://training-platform-v2-staging.vercel.app`.
  Canonical alias and promotion mapping were verified against this exact ID.
- Local and hosted production builds passed. Hosted prebuild verified V2
  isolation, all 85 real MP4 media objects and all three course manifests;
  compilation and TypeScript passed. All four existing cron definitions remain
  in the submitted configuration and source `vercel.json`.
- Standard bulk uploads exceeded local available memory before creating a
  deployment. The successful upload hashed materialized source files in a
  bounded buffer, reused existing source objects and uploaded 432 changed
  objects (61,130,405 bytes) individually. Binary uploads were checked by the
  host against their SHA1. The authenticated CLI handled credentials; none
  were read or printed. No Git LFS pointers were uploaded as media.
- Four protected-candidate resources were compared byte-for-byte before
  promotion: the root compatibility entry, manifest, SCORM entry and quiz 16.
- At `2026-10-29T15:28:58.956Z`, eleven live resource checks passed: root and
  SCORM entries, manifest, LMS script, first/last quiz, first/last interaction,
  slide 1 and the complete 19,649,666-byte video 1. Each full response matched
  the source SHA256. The largest 277,741,826-byte MP4 also served an exact
  4,096-byte range with HTTP 206 and the correct total size.
- Live source-video SHA256:
  `12095d4ef5c549c918e0c5809c9f6a1e2fb625b449f76f01002c457b2191fef0`.
- The saved review rows were unchanged after promotion: VPSHR current revision
  82 / document MD5 `aaa0a8f3c8dda770c54be695852a84d3`; cancelled VPSHR
  revision 56 / `db1c73ca6a2a6c0cd3d22bd49a0334e3`; Tiger revision 36 /
  `411ada1b5dabf73532ede7b46d36083b`.

Correction registration remains a separate action. Its exact prevalidated
transition selects LU9 only and preserves the other twelve LU confirmations.
No review decisions, endorsement, correction registration, notification email,
learner progress or course-publication approval were submitted during this
release. Browser playback and answering all embedded quizzes have not been
claimed as runtime acceptance.

QA JSON, scripts and logs are retained at
`C:/Users/Johan/Codex-Work/lu9-republish-20261029/`.
