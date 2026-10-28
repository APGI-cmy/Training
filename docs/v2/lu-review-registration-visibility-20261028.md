# LU review registration visibility and current-version status

The implementation editor was intentionally blocked on an unregistered deployment,
but disappeared without a local explanation. The LU modal now shows a clear paused
message and a direct Open Changes implemented action beneath an eligible designer's
open/reopened finding. The link closes the modal and opens the registration section.
The normal numbered editor returns only when freshness, review availability and
existing designer permissions permit it. No authorization or approval gate changed.

Initial review previously counted the earlier registered version's confirmations
while displaying a new deployed package. The server now supplies the verified
correction scope to the LU workspace. Only changed units show Initial review red
before registration and an unchecked, locked current-version coverage control.
Earlier saved confirmations are retained as history. The same distinction appears
beside the presentation's coverage control. After registration the existing database
coverage rule continues to require every assigned primary content reviewer to
confirm the updated unit; unchanged-unit confirmations remain saved.

## Verification

- Source: `d4b177c82f2c5f7bd91324091e81de63c4fdc16b`, including the implementation
  notice change `2c0e3e5061386ded0a1fc31743df807f0bd0991c`.
- 875 tests in 93 files and TypeScript passed.
- Deployment `dpl_BRKhPmhj3QQZyL5mRXiCY5VEdiag` reached READY and was promoted to
  `https://training-platform-v2-staging.vercel.app`.
- Hosted prebuild verified all 85 real MP4 files and compiled successfully.
  The LU1 package entry remained byte-identical to the approved SCORM source.
- Live LU1 modal shows Initial review red, 0/2 current-version confirmations,
  both reviewer names, and the earlier confirmations retained as history.
- The finding-local registration link closes the modal and opens the exact
  Changes implemented section. That section still reports only LU1 needs recheck.
- Unchanged LU2 retains Johan's checked coverage and personal Complete status;
  its pre-existing team requirement remains outstanding.
- The entire review document stayed unchanged at revision 73, with 16 findings,
  two reports and hash `f80683bc45a3442e574e52ffa1cf20f3` before verification.
  No review response, endorsement, registration, read receipt or notification was
  submitted during these UI checks.
- Bounded deployment error/fatal scan returned zero entries, 14:36:15-14:46:15 UTC
  (16:36:15-16:46:15 SAST) on 28 October 2026.
- Live screenshots and logs are retained under
  `C:/Users/Johan/Codex-Work/implementation-registration-visibility-20261028/`.

Course assets, course definition and shared playback engine were unchanged by this
release. The deployed content fingerprint remains `82420476dbb8d3855b681a8ce7f507268c0348ba79e47c4f20542cb907aeb8b4`.
