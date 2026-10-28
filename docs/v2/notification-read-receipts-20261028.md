# Read receipts inside review feedback

Notification labels in feedback findings, LU headers, the LU overview and the review notification overview now offer **Read receipt**. All reuse the existing signed-in-recipient notification action, with operation `read`. They share the same persisted receipt as the Notifications page. Existing inbox controls remain unchanged.

An unread label shows a disabled saving state while recording. Success shows **Read receipt recorded**; failure shows a retryable error. Reading does not acknowledge an approval, complete a review task, change a finding, or navigate away from the open LU. Native buttons sit outside navigation buttons and links; the LU target IDs remain on non-interactive card containers.

## Verification

- 851 release tests in 88 files passed; TypeScript, environment isolation, media validation, and review manifests passed. Course content identities are unchanged.
- Live UI: Notification 4483, from the user's screenshot, correctly displayed its existing read receipt in both the finding label and LU header.
- Live round-trip: Notification 7067 was read from the LU7 header at 11:08:36 SAST on 28 October 2026. The modal stayed on LU7. The matching overview label updated to read, and unread count changed from 39 to 38 while action count stayed at 21.
- The Notifications page showed the same notification as **Action required · Read**, with the exact receipt time. Its required-action control remained. Another 37 **Mark as read** buttons remained available for unread inbox entries.
- Browser DOM check: zero receipt buttons nested inside another button or link. No application-console errors observed; one unrelated browser-extension content-script error was present.
- Bounded runtime error/fatal log scan returned zero records.

Deployment `dpl_HWd9upu5NkssQVPAFHcbGSofhnHn` is READY and promoted to `training-platform-v2-staging.vercel.app`, verified through the alias API. Feature source commits: `5e65fdbdea1e41f2948bfb88cb8f223ad2bcd929` and `c92d7947`; `bfa4edae` normalizes stylesheet line endings only. No database schema change, course correction registration, review submission, approval, or outgoing email was performed.

Screenshot evidence is saved in the user's Training portal platform project under `Review notification receipts - 2026-10-28`.
