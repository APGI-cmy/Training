# APGI Training Platform Version 1 Release and Operating Record

Version 1.0.0 is accepted for the first learner intake using administrator invitations and manual enrolment. Johan authorized final preparation and sign-off on 13 October 2026 after completing the fresh-account signup, email confirmation, Profile and Dashboard test successfully.

## Published service and release identity

| Item | Release record |
| --- | --- |
| Learner platform | https://training-platform-kappa.vercel.app |
| Course | Scannex Training Programme |
| Repository | APGI-cmy/Training |
| Release tag | `v1.0.0` |
| Verified application baseline | `7a6b61ddeac5b6cfc835b541255b90a7074cf35b` |
| Verified baseline production deployment | `dpl_5QYBzVPeeCp8VUNpyQj3wAjvU1Wt` |
| Baseline deployment URL | https://training-platform-parrtvdl9-rassie-ras-projects.vercel.app |
| Hosting project | Vercel `training-platform`, team `rassie-ras-projects` |
| Course integrity record | [SHA-256 course-file manifest](platform-v1-course-manifest.json) |
| Detailed QA | [First learner QA](scannex-first-learner-qa-20261013.md) |

The release tag identifies the complete source snapshot, including version metadata and these records. The private final deployment certificate records the tag's exact commit and production deployment after publication. No credentials, invitation links or learner personal details belong in release records.

The course manifest hashes the bytes stored in Git and the verified media objects represented by Git LFS. Windows may convert text-file line endings during checkout; compare the stored Git content when verifying those text files. The course media hashes refer to the actual media, not pointer files.

## Supported first-intake workflow

1. The administrator opens Administration → Invitations, chooses Scannex and the learner's organisation, records the access basis and sends the invitation.
2. The learner opens the invitation and signs in or creates an account using the invited email address. A new account confirms that email through the confirmation message.
3. The learner completes Profile, including the certificate name, and selects **Save profile and open dashboard**.
4. Valid invitations for the verified account email are enrolled automatically. The invited course appears on Dashboard and opens from its course card. There is no separate acceptance or approval step.
5. The learner works through the published units. The hosted activity records progress against that learner account and offers to resume when reopened.

Manual enrolment and access administration remain available to administrators. The operational Scannex Viewer practice service is available in the configured eligible unit; it opens separately from the learning activity. Learners follow its published practice, streaming and sign-out instructions. Viewer streaming remains subject to the configured AWS capacity, availability and billing arrangements.

If an invitation reports a different email address, the learner must switch to the invited account. Expired or revoked invitations require administrator follow-up. From Sign in, **Forgot password** sends the reset path to the learner's account email; the learner completes the password change themselves.

## Verification and acceptance

- 91 focused regression checks passed on the Version 1 preparation branch, followed by a successful optimized production build.
- Media validation confirmed 74 MP4 files are actual media objects.
- Published structural checks passed for 48 quizzes and 231 graded questions across LU1–LU8, including the saved presentation object settings and compiled quiz settings/routes.
- Live availability checks passed for eight compiled unit entries, eight introduction videos and 61 web-object URLs.
- The owner completed the fresh signup and confirmation-email flow, reached Profile first, saved it, and saw the invited course on Dashboard. Live records corroborated mailbox verification, completed profile, active learner and matching invitation redemption/enrolment.
- Password recovery was completed by the owner, who then signed in successfully.
- A live LU1 sample saved progress, left the activity and reopened at slide 3 through the native resume prompt. This check did not assign a pass or fabricate a score.
- Invitation and enrolment tables retain row security. Direct anonymous/learner execution of the audit-writing RPC is denied; the recovery budget is not browser-accessible.

## Version 1 boundaries

Online checkout and payment processing are excluded, as requested by the owner. Administrators enrol learners manually for this intake. Future payment, certificate automation and reviewer roadmap items are not represented as completed by this sign-off.

Scannex contains eight teaching units and the existing final knowledge/practical assessment entry. LU9 teaching-material redevelopment was cancelled and is not part of this release.

The older roadmap test suite recorded 102 passes and 57 failures, including future features and legacy assertions. It is retained separately; this acceptance is for the supported first-intake workflow and does not declare that roadmap suite green. Full independent listening across every clip, full accessibility acceptance, and every native quiz retry/remedial route were not repeated during this final platform check. Structural authoring evidence and the observed live learner sample are recorded separately.

## Release protection and recovery

Keep `v1.0.0` unchanged. Develop subsequent changes on a new branch, check them and release a new version. Published course files must be replaced through the established publishing and deployment process; do not edit a release copy in place and continue calling it Version 1.

If the learner platform needs recovery, use Vercel's deployment history for the `training-platform` project and restore the recorded Version 1 production deployment, or redeploy the exact tagged source. The verified baseline deployment above is also a known working application build. Confirm administrator access, an enrolled learner's Dashboard and a learning activity before resuming invitations.

Restoring an application deployment does not restore Supabase data or AWS configuration. Preserve learner records, invitation audit history and the applied security/recovery migrations. Do not reverse those migrations or restore a database backup as part of a routine website rollback. Any separate database recovery needs its own reviewed procedure.
