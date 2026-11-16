# Invitation Delivery Preflight — Batch 3 Separate Lane

## Status

| Field | Value |
|---|---|
| Module | ALP — APGI Learning Portal |
| Authority | CS2 Johan Ras, 2026-07-28 |
| Scope | Provider/security/operations preflight only |
| Implementation | Not authorised |

## Current fact

The W4.2 invitation action creates an opaque one-time token, stores only its hash, records invitation/audit state and presents the path once to the administrator. It does not send an email. No `sent` event or delivery claim is valid without a successful provider operation.

## Decisions required before implementation

1. Approved transactional-email provider and account owner.
2. Sender address and display name.
3. Sending-domain ownership plus SPF, DKIM and DMARC posture.
4. Production and preview environment separation.
5. Vercel team/project ownership for server-only credentials.
6. Server-side adapter contract and timeout behaviour.
7. Token-link construction using the approved production origin.
8. Data minimisation: recipient, course, expiry and necessary template fields only.
9. Logging prohibition for raw tokens, token hashes, credentials and message bodies containing secrets.
10. `created`, `sent` and `failed` event semantics.
11. Idempotency key and duplicate-send protection.
12. Retry, bounce, complaint, suppression and support handling.
13. Administrator UI outcomes: created-not-sent, sent, failed/retry-safe.
14. Test strategy for delivery success, provider failure, expiry, wrong email, reuse and revocation.
15. Cost, rate limit, retention and incident ownership.

## Candidate evaluation criteria

Any provider proposal must be evaluated for API security, sender-domain support, South African/global deliverability, EU/UK data handling implications, auditability, sandbox/test capability, webhook authenticity, rate limits, operational ownership and cost predictability.

## Required outputs

- approved provider decision or explicit no-provider disposition;
- architecture and security decision record;
- environment-variable inventory without secret values;
- email template contract;
- delivery adapter interface;
- QA-to-Red catalogue;
- implementation and rollback plan;
- independent review before any secret is configured.

## Prohibitions

This preflight does not authorise provider account creation, DNS changes, Vercel secret writes, email dispatch, live invitation mutation, payment work, W4 closure or production-readiness claims.