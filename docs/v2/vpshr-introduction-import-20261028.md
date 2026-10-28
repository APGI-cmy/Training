# VPSHR introduction replacement, 28 October 2026

The user approved the new welcome film and requested import into both the
PowerPoint source and the V2 training platform. The film lasts approximately
2 minutes 20 seconds, with Leah narration, English captions and a transcript.
It has no internal Next button or automatic course navigation.

The native PowerPoint copy replaces the exact old embedded video in
`Main Introduction to course.pptx`. Its 16:9 canvas, theme and media object are
preserved. The playback duration is updated from 27 seconds to 139688 ms;
automatic slide advance is disabled. A visible-caption video rendition is
embedded to preserve captions when exporting from PowerPoint/iSpring. The
original PowerPoint is unchanged. Package, geometry and first-party import
validation pass; native PowerPoint verification is recorded after opening.

The SCORM 2004 package is imported into the existing stable introduction path,
retaining the older iSpring assets for recovery. Catalogue media pointers and the
displayed duration are updated only for the introduction. Embedded mode fits the
platform frame. A read-only adapter supplies the video timestamp to the existing
review-location interface; it does not change scores, learner progress or roles.
The platform's existing Next-unit completion behaviour remains in force.

Source scope evidence: all 12 other LU catalogue objects, other course package
hashes and the shared playback engine are unchanged. The exact transition is:

- Previous: `b47c284e32ff813100ba0cd63fefb09fcb67146ad73204f681067cecf72e7664`
- New: `4f90eaf9ff306b9f77c0b6ed2543d4430a96e8e583519200c5879822eb3850f4`
- Recheck: `introduction` only. Existing outstanding LU5/LU11 work stays outstanding.

Correction registration uses the existing locked compare-and-swap transaction.
It retains findings, screenshots, report history, unchanged-unit coverage and
commercial schedules. This import does not approve findings, endorse reviews,
publish the course for learner enrolment, send email, alter payment settings or
affect V1. Verification and deployment evidence are recorded below after release.

## Release verification

- Source commit: `cc7d44c74590d3058578b5922da5a277e9f1b159`, pushed to `v2-development`.
- Deployment: `dpl_5jfP4MpYnvsrB45b6F2nfmxgQGYT`, READY and promoted; canonical alias verified as `training-platform-v2-staging.vercel.app`.
- Live MP4 downloaded from the canonical alias and matched the approved SHA256 `8033ad04e8d0600c4041657003164514ba26c0a1186bd498a20e55c4ae784b5d`.
- 849 tests in 88 files and TypeScript passed. Sixteen standalone player behaviour checks passed.
- Native updated PowerPoint opens without a repair prompt, plays the new embedded film and shows burned-in English captions. Native playback screenshot retained with deliverable.
- Live standalone video plays, displays English captions and reports duration 139.687667 seconds. No browser warnings or errors were captured; bounded deployment error/fatal scan returned zero records.
- Migration `20261028082943_intro_video_correction_scope` applied in V2 project `eaaqgtdpvbxdgjxphjie`.
- Locked correction registration committed revision 64, fingerprint `4f90eaf9ff306b9f77c0b6ed2543d4430a96e8e583519200c5879822eb3850f4`. Changed unit is only `introduction`; 12 unchanged units are preserved. All 16 findings and 2 submitted reports remain. Assertions verified unchanged replies, screenshots, implementation rounds, endorsements, commercial schedules, identities and coverage outside introduction. No email was queued.
- Authenticated review page shows the new version, retained introduction findings, enabled feedback form and unchecked introduction coverage. No test finding or reviewer acceptance was submitted.
- Browser limitation: the embedded iframe remained blank in the automated Edge check, while the same live player works via Open expanded unit. Embedded playback and live timestamp tracking could not be verified in that browser. The adapter has automated tests; this does not replace the remaining embedded runtime check.
- This is a staging content deployment, not learner-course publication or review approval.

GitHub initially rejected the MP4 LFS upload because the account's LFS budget was exhausted. This approved 12.9 MB file is committed as an ordinary Git object through a single exact-path attribute exception; its real bytes were verified in the pushed commit. No other video storage rules or account subscriptions changed.
