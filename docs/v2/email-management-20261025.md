# Email management — 25 October 2026

Entry: **Messages and support → Email management**, `/messages/email-management`.

The new manager covers administrator/company invitations, email message sets,
account help and confirmation emails, support notifications, policy review and
payment setup notification metadata. Learner invitations and course-review mail
remain in their separate existing trackers and are excluded from this ledger.

Administrators can search by recipient, subject and company; filter category and
follow-up state; inspect history; refresh delivery status; record a follow-up note
and date; and resend to the original recipient. Each resend retains the message
identity and records a new sending attempt. Follow-up notes do not schedule mail.

## Evidence and boundaries

- Provider acceptance, delivery to a mail server, reported opens/clicks and
  invitation activation are distinct. Delivery does not prove inbox placement;
  automated scanners and privacy tools can affect engagement reports.
- One reported missing admin invitation was confirmed delivered in Resend. The
  SMTP response was from Outlook. The user subsequently found it in Junk. The
  tracker contains a checked delivery observation, without inventing an exact
  delivery event timestamp or an open event.
- Historical metadata is imported from existing non-learner invitation events,
  message-set outbox, support deliveries and policy deliveries. Previously
  unlogged auth mail and historical opens cannot be reconstructed.
- Company owners see their company records. APGI administrator/principal scope
  is checked on every server action; protected platform account and payment
  categories retain their tighter boundaries.
- Invitation and auth links are omitted from stored message content and browser
  output. Invitation resends use the existing checked token-rotation operation;
  account help requests a fresh email through the existing recovery budget.
  No administrator chooses or receives another user's password.
- Message-set resends preserve the saved snapshot, recheck current recipient
  eligibility, paused state and marketing opt-in. Policy and support resends
  recheck the current related record. Sensitive payment setup requests use their
  original private workflow instead of copying stored security links.
- One-minute resend claims prevent rapid/concurrent duplicates. Reported bounce,
  complaint and suppression events block a resend of the affected email.

## Provider connection

Resend endpoint: `https://training-platform-v2-staging.vercel.app/api/email/events`.
Webhook identifier: `ee861fa2-1f74-4de9-84c6-73158702a8ca`.
It listens for sent, delivered, delivery_delayed, bounced, failed, complained,
suppressed, opened and clicked email events. The server verifies the raw payload
signature with a protected V2-only setting, enforces a five-minute timestamp
window and deduplicates event IDs. Only provider ID, event kind and timestamps are
retained; recipients' IP addresses, user agents and full provider payloads are not.
The existing restricted sending API key was retained; no broad read API key was
created. Refresh uses received signed events when no dedicated read key exists.

Open/click reporting was requested for the shared sending domain. A new tracking
subdomain was prepared in Resend; DNS verification remains a separate handoff:

| Setting | Value |
| --- | --- |
| DNS zone | apginc.ca |
| Type | CNAME |
| Name / host | email-track |
| Target / content | links2.resend-dns.com |
| TTL | Auto / default |

After adding that record in GoDaddy, use **I've added the record** in
[Resend tracking setup](https://resend.com/domains/1f4f4786-e265-4519-bf72-9a64ece9ecc2/tracking/2961c95a-0459-40e5-94b0-f4070d5d8923).
The user authorised preparation for the shared domain. No DNS record, DNS
delegation, TLS setting or V1 application code was changed in this release.

## Verification

- TypeScript check and local production build passed.
- Release suite: 681 passing tests in 68 files.
- Transactional database tests rolled back all fixtures: company isolation,
  ordinary-user denial, foreign-ID denial, service-only grants/RLS, private-link
  omission, resend throttling, follow-up persistence, event deduplication and
  out-of-order delivery/open evidence all passed.
- Real opt-in provider integration sent only to Resend's official delivered and
  bounced simulation inboxes. Both signed events reached the deployed route and
  were recorded. Repeating an accepted idempotency key returned the same email.
- Browser checks verified the sidebar entry, recipient search, history, the
  separate activation status, a simulated resend and its second delivered event,
  a disabled resend on the bounced simulation and saved follow-up notes.
- Advisor checks retained the existing three signed-in role-helper warnings and
  leaked-password-protection warning. Four new service-only RLS tables have no
  client policies intentionally; anonymous/authenticated grants were denied.
- Public course packages and fingerprinted playback sources were unchanged.
  No dependency trees or filesystem links were created under OneDrive.

Normal tests never send email. The explicit integration command is:

```powershell
$env:RUN_V2_MAIL_INTEGRATION='yes'
node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.mail-integration.config.mts
```

Provider simulations consume a small sending quota. Their local report is under
`C:/Users/Johan/Codex-Work/email-management-20261025/`; real reviewer/admin
invitations were not resent by the engineering checks.
