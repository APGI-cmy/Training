# Personal review messages and recipient tracking

The later [direct LU endorsement release](direct-lu-endorsement-20261028.md) replaces the separate original-author acceptance described below. New implementation responses move straight to Endorsements; earlier saved decisions remain intact.

Each LU now has a **Messages for you** inbox with explicit To and From labels. These are the signed-in person's own action notifications. They are no longer inserted beneath another reviewer's finding or email heading. Other reviewers' submitted findings remain shared snapshots; their personal inboxes are not displayed.

**Messages you sent** is a separate, paginated receipt table on the Notifications page and inside each LU. Every recipient has a separate row, notification reference, platform delivery time, read state/time, outstanding response and reminder history. Sender rows have no read button. LU tables filter by the selected unit, including course-wide records. Fifty-row pagination supports larger teams and long review histories.

The sender can send a platform reminder for an unread message after 24 hours, at most once per 24 hours. Closed, overdue or removed assignments cannot receive new reminders. The original remains unchanged; reading a reminder updates the original receipt for that same recipient. Email delivery remains a separate mechanism. Installing this release does not send a reminder email.

Messages guide the recipient through the actual required action: recheck and confirm coverage if still outstanding, decide on a numbered designer response for their own finding, or independently endorse another person's record. No self-endorsement is permitted. Future LU workflow emails go to the affected recipients with individual instructions rather than a common message to the entire team. Existing source registrations and coverage are not reset.

## Rejections and larger teams

One eligible additional Yes endorsement closes the record even with five or more reviewers. Remaining endorsement requests resolve on refresh. A new No requires a reason and returns the record for correction. For an implementation response, the peer rejection is recorded separately from the original author's acceptance; the designer submits the next numbered correction. A rejected satisfied declaration returns to its author for a revised review. Earlier No decisions are retained with their original meaning rather than retroactively reopening them.

## Validation

- 861 application tests in 91 files and TypeScript pass; six-person team tests exercise five independent peer requests and single-endorsement closure.
- Database rollback tests with six verified identities verify recipient-only reads, sender-only reminders, the delay/cooldown, five separate receipts, same-recipient reminder-read propagation and unchanged real review data. No live reminder, reviewer decision or email was sent by these tests.
- All new helpers use SECURITY INVOKER and are service-only; neither authenticated nor anonymous public clients can execute them directly. Existing private notification-table protections remain. Advisor comparison introduced no findings.
- Review data before/after migration: revision 73, 16 findings, 2 reports, identical document MD5 `f80683bc45a3442e574e52ffa1cf20f3`. Course fingerprints remain unchanged; 83 real media objects and three manifests passed prebuild checks.
- Applied migrations: `20261028101443_personal_review_message_tracking`, `20261028101734_review_message_projection_compatibility`, `20261028101909_review_reminder_recipient_guard` in the V2 database.

Source feature commit: `0eb6cf66`. Live release verification follows below.

## Live release verification

Final deployment `dpl_C1cLscJyhS2PjpKyLUKJnMmoRo1R` is READY and promoted to the canonical V2 alias; the alias API confirms project `prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf`. Final interface source: `e3334c96c88f5d5c88ba3aa5e8d228ca5d85404e`.

Signed-in LU5 shows notification 4487 under **Messages for you**, explicitly **To: johan.ras@apginc.ca**, **From: jorrie.jordaan@apginc.ca**, with numbered endorsement instructions. Its original read receipt is preserved. There are zero notification cards under other reviewers' findings and zero old LU marker mounts.

LU5 sender tracking displays five message rows addressed to Jorrie, each with a distinct reference, platform delivery and read status. There are zero sender-side read buttons. Newer unread messages have reminder controls disabled for 24 hours; an older unread message is eligible. No reminder was clicked or sent.

The Notifications page shows only Johan as the incoming recipient. Its sent-message summary has 64 rows, supports Older/Newer pagination, and page two displays the remaining 14 rows. Message bodies are collapsed in the table; required incoming actions use numbered steps. No application console errors or bounded deployment error/fatal records were found.

After all live checks, the real VPSHR review remains revision 73 with the same document MD5, 16 findings and 2 reports. No review decision, read receipt, endorsement, publication action or outgoing email was performed during this release's live verification. Derived platform action notifications were synchronized through the new feature.

Screenshots and the verification receipt are saved in the user's Training portal platform project under `Personal review messages - 2026-10-28`.
