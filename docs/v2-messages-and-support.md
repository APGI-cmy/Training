# V2 messages and support

Approved scope, 21 October 2026: user-to-first-level-administrator messages, replies, attachments, escalation to APGI, personal read receipts, reusable admin message templates, and once/daily/weekly/monthly scheduled messages. AI composition, event-based message configuration and course reports remain V3 work.

## User flow

Open **Messages and support → Messages and support** in the grouped sidebar. Choose a company, enter a subject and message, and optionally attach one PDF, PNG, JPG or text file (maximum 2 MB). Company support goes to active company owners first. If none is available, it goes to APGI. Active company owners can escalate the conversation to APGI. Replies remain in the same conversation and notify the other participants by email and platform notification. The sender or an administrator can close and reopen a conversation.

Administrators can send directly to a verified member/enrolled user in a company they administer, or to one of the registered APGI principal email addresses. The latter supports Jorrie's pending V2 registration without fabricating his account or identity. Access binds to the verified email after registration; email alone never grants an admin role. The existing V2 invitation remains the account-activation route.

## Templates and schedules

**Message templates and scheduled sends** is available to APGI administrators and active company owners. Templates belong to their creator. Example welcome, course-deadline and company-enrolment messages are editable starting points; nothing sends merely because an example is displayed.

A scheduled send stores a snapshot of its subject, body, selected company and explicit recipient list. Editing the source template does not change it. Up to 200 scoped recipients per schedule, with a separate private conversation for each. Dates are explicitly SAST (UTC+02:00), converted on the server. Repeating schedules require an end date within one year; up to 25 active schedules per owner. Pause/resume is available. Completed/past-end schedules cannot resume. Schedules recheck administrator and recipient eligibility on every dispatch and pause if scope changes. They do not send a backlog after a missed run. Recipients are explicit, not inferred from future enrolments; automatic enrolment/deadline conditions are a V3 extension.

The authenticated Vercel cron `/api/cron/messages` runs every ten minutes and dispatches due schedules, then drains queued email in bounded batches. High-volume email may take multiple batches. Recurrence preserves the scheduled time. Messages use a stable idempotency key and a leased durable outbox; ambiguous delivery retries stop before the provider's 24-hour idempotency expiry. Exhausted/expired attempts are reported as such, rather than silently claiming delivery.

## Privacy and receipts

All new tables have RLS enabled with no public policies and no public/anon/authenticated table access. RPC execution is service-role-only; each server action derives its actor from a confirmed provider session and SQL rechecks scope. Private attachments are downloaded through an authenticated, authorized route, as downloads with no caching or MIME sniffing. No public storage URLs are generated. File signatures, names and sizes are validated. Sending through this facility does not grant any course, commercial, banking or payment approval.

Company administrators can access company support conversations; APGI can access escalated support. Direct conversations are visible to their participants, including their sender. Current company support access and email delivery are rechecked after owner revocation. Read receipts record opening the conversation in the platform. Email `accepted` means Resend accepted a message and supplied an ID; it does not prove inbox delivery or reading. Pending recipients receive their inbox notifications only after verifying the matching account.

## Verification and boundaries

`scripts/qa/message-workflow-transaction.sql` runs temporary fixtures in a transaction and rolls back. It checks first-level routing, company separation, sender deduplication, receipt persistence, blocked unauthorized actions, administrator escalation, private attachments, scoped schedules, dispatch replay, access revocation, and Data API privileges. Unit tests cover verified actor binding, failed delivery recovery, invalid attachments, SAST conversion and safe notification links.

V2 retains its separate database, deployment and transactional-email identity. V1 and live payment activation are outside this change. Stripe setup messages must never request API keys, passwords or bank information in a conversation; Jorrie uses his private payment setup instead.
