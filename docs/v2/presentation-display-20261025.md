# Presentation display controls — 25 October 2026

Reviewers reported that the iSpring presentation was too small and had no visible full-screen control. Review learning-unit pages now use the same display wrapper as the ordinary published learner presentation. The wrapper offers Enlarge presentation, Full screen, Return to page and Exit full screen.

The existing iframe stays mounted while the display changes. Its slides, playback, activities, quizzes and authored controls continue in the same session. Review feedback is inside the fullscreen target and has reserved space below the player so its floating button does not cover the presentation navigation. Browsers that reject native fullscreen retain an enlarged browser-window view and an explanatory status message.

The SCORM runtime and course packages are unchanged. Preview persistence boundaries and saved review coverage are unchanged. The first release candidate changed only SCORM labels/classes but nevertheless changed the protected engine fingerprint; that candidate was immediately withdrawn. The final change places all display behavior outside the fingerprinted engine. No review revision was registered and no stored review evidence was changed.

## Automated verification

- TypeScript check passed.
- Learner release suite: 663 passing tests, including wrapper coverage for reviewer feedback and the published iframe.
- Local production build passed; hosted build also checks V2 isolation and real course media.
- 82 MP4 files verified as real media objects.
- No public course packages or fingerprinted engine sources differ from the previous release.
- No dependency links or symlinks were introduced. Sources and real dependencies remain outside OneDrive.

## Release and browser evidence

Functional commit: `ce45a0a8c47ec9c711f8164f0e8cd171e1efd6a1`.

Deployment `dpl_Eu7mmKm5tXM4QLxEFeXJbtgVybAc`, project `prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf`, was verified READY/PROMOTED at the canonical V2 alias. Its commit matches the functional commit above. A runtime error-log query over the release check period returned zero records.

Signed-in Edge verification used the existing NKS Capital Tiger Kidnapping review, LU1:

`/course-reviews/f1ef8430-64d6-410d-abdf-18a1c0260ded/units/lu1`

- Existing fingerprint `79ca8ab7e4f1` and saved coverage remained intact. No changed-version gate remained.
- Normal iframe height increased from 380 px to approximately 645 px in the test viewport; enlargement filled the browser window with a roughly 724 px high iframe before fullscreen fallback messaging.
- Slide 2 and its video remained in the same session across enlargement and Return to page.
- The embedded foundation activity opened and Begin activity worked in the enlarged view.
- Navigation reached the authored LU1 knowledge check. Start Quiz opened question 1, its answer choices and Submit control. No answer was selected or submitted.
- Review feedback opened its existing-finding dialog and the new-finding editor while enlarged. No finding was saved. Closing feedback left the quiz visible.
- Escape from the portal toolbar and Return to page restored the normal view while preserving question 1.
- Native browser fullscreen was requested through the visible button, but this automated Edge session rejected it. The explanatory fallback and enlarged window worked. Native fullscreen/exit behavior is implemented but not claimed as verified in this session. Mobile and other browsers were not exercised.
- No actual learner attempt, review report or coverage confirmation was submitted. Testing was representative LU1 playback, not exhaustive acceptance of all eight units.

Proof: [enlarged quiz](qa/presentation-enlarged-20261025.jpg), [feedback beside the enlarged presentation](qa/presentation-feedback-20261025.jpg).
