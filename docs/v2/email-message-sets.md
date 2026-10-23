# Company email message sets

Open **Messages and support → Email message sets**. The old `/admin/email-templates`
address redirects here. Verified APGI principals can administer all companies;
company owners administer only their own active company workspace. Company
administrators share saved sets, rather than each author having a private copy.

Each set has a purpose/policy note and any number of individual emails. An email
contains a subject, heading, paragraphs, button, destination and either its course
cover, no cover, or a public HTTPS graphic. The platform renders escaped, branded
HTML; arbitrary executable HTML is not accepted. Preview and actual delivery use
the same renderer, including the V2 environment notice. A preview can be downloaded
as HTML. Delivery history retains the immutable design and personalisation snapshot.

Eight prepared drafts cover welcome/support, completion feedback, two-week
reminders, group updates, promotions, review submission thanks and published-course
thanks. Administrators can create these for their company using the prepared-set
control. APGI's Tiger Kidnapping set was prepared as inactive drafts.

## Timing and events

- Date schedules: once, daily, weekly, monthly or yearly. Repeating schedules need
  an end date within five years. Monthly/yearly dates use the original SAST calendar
  day, clamping to the month's last day without cumulative drift. Missed cycles are
  skipped rather than sent as a backlog.
- Enrolment: a learner's company enrolment becomes `enrolled`.
- Completion: the platform completion record becomes `completed`.
- Deadline: administrator supplies the real course/group deadline and days of
  notice. Only currently enrolled, incomplete learners qualify. Messages stop on
  completion, enrolment revocation, the message end or the deadline. This reminder
  date does not itself revoke access.
- Group follow-up: all currently enrolled group members complete the chosen course
  and at least one completion occurred after activation. Provides current enrolled
  and completed totals. Individual course reports remain future V3 work.
- New course: an explicitly reviewed and published company offering becomes
  available. Uploading an unapproved SCORM package cannot trigger a promotion.
- Review thanks: content report submission or an assigned branding/commercial
  decision, including the APGI principals' exact commercial-version decisions.
- Published review: thanks to the assigned reviewers when their reviewed release
  is published. Existing mandatory review notifications continue separately.

Event rules watch future events after activation, with an optional later start.
They send once per event and recipient. New-course marketing can target first-time
enrollers only: users with no previous enrolment in that company. Announcements
require affirmative recipient opt-in, managed in **Messages and support → My email
preferences**. Marketing messages contain the same preferences link.

Saving never sends. New and edited emails become drafts; preview the saved version
and activate explicitly after confirming company policy, recipients and timing.
Pause/resume is available. Up to 25 emails may be active per company. The existing
ten-minute message cron runs both the earlier schedules and this new queue.
The platform rechecks company authority, recipient eligibility and marketing
preferences before delivery. Each recipient receives an individual email.

## Review invitations

The **Review invitations** tab shows saved requests, assignments and provider
acceptance status. Saved invitation previews remove private joining tokens. If a
course has no saved review request, the tab states that fact and displays only an
example. Creating a set or preview never creates or sends a review request.

## Delivery and access

The existing verified Resend sender and V2 transport are reused. Immutable outbox
IDs supply stable provider idempotency keys; leased claims support retries.
Unconfirmed sends expire before the provider's 24-hour idempotency window.
`accepted` proves provider acceptance only, not inbox delivery or reading.

Tables and public RPCs are service-role only, with RLS enabled and no anonymous or
authenticated grants. Server actions obtain the actor from the verified session.
Every write checks company authority and revision. The private event trigger is a
restricted security-definer function so authenticated learner progress can append
to the private service log without obtaining direct access to it. It cannot be
invoked through the public API.

## Verification

The release test suite covers rendering, unsafe URLs, placeholders, permissions,
immutable delivery, retries and activation. `tests/sql/email-sets-transaction.sql`
exercises the actual V2 RPCs and triggers: company isolation, drafts, deduplication,
opt-in/out, completion, deadline stopping, yearly schedules, concurrent-edit
rejection, review tasks, publication and group completion. All temporary users,
company records and queued messages are rolled back. No real email is sent by
these checks. Live browser checks use draft saves and previews.

AI-assisted authoring and detailed course-report generation remain V3 work.

### V2 verification on 23 October 2026

Functional release `daaecd9` was built and promoted in the V2 staging project
(`dpl_D2ALo2AVLdVfVjp6ZDT7CamWtmL9`). All 613 release tests passed. The rolled-back
database exercise passed the actual event and tenant-isolation checks above.
Live browser checks confirmed draft saving, preview rendering, preserved dropdown
selections after preview, and removal of private tokens from saved review invites.
The original enrolment preview remains available under Review invitations.

At verification, APGI had eight prepared Tiger Kidnapping drafts, zero active new
email rules and zero deliveries from this feature. No Tiger Kidnapping review
request had been submitted yet; its invitation view therefore showed an example,
while the existing VPSHR request displayed its saved invitations and acceptance
records. These are dated verification observations, not permanent course states.
