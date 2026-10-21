# APGI Stripe partner payment setup — 21 October 2026

The shared portal is `/admin/payments/stripe`. It is restricted to verified platform principals and shows setup progress, partner routing, links to commercial reviews, published-course sandbox checkout links and a payment/transfer ledger. Existing editable payment-planning records are not settlement authority.

## Private account capture

APGI's existing Canadian Stripe account belongs to Jorrie. Only the verified, bound principal `jorrie.jordaan@apginc.ca` may open `/admin/payments/stripe/private` or submit the private setup action. Johan's principal access does not grant access to this form or its saved keys. Backend processing can decrypt the restricted sandbox credentials; the browser cannot retrieve them. AES-256-GCM encryption uses a server-only Secret in the isolated V2 hosting project. Hosting/database administrators remain a separate privileged boundary; this is not a claim of secrecy from infrastructure administrators.

APGI bank account details are entered or checked directly in Stripe Dashboard, never captured in platform database fields. Only restricted `rk_test_` credentials and a test webhook signing secret are accepted. The connection checks the platform's Canadian country and Connect API permissions. A saved connection does not prove webhook delivery or completed payment testing.

Each future company's assigned owner has a collapsed private payment section at `/company/{companyId}/payments`. Other administrators cannot open that owner's Stripe onboarding through platform actions. The section explicitly states that account details are used only for payment purposes, including receipt of agreed shares, refunds and reconciliation. The owner acknowledges this purpose before continuing. Stripe collects banking and required verification information through its hosted onboarding and connects the recipient account to APGI's Connect platform. The platform stores only routing/approval metadata, not bank account numbers or identity documents. A new owner must hold the active company-owner membership; client-supplied identity is ignored.

## Setup request and messages

Either APGI principal can send the reserved setup request to Jorrie's exact mailbox. It is stored once with the email provider's acceptance ID. An existing valid administrator invitation is preserved; if none exists and Jorrie has no verified account, a new invitation is created. An invitation token created for this request is encrypted and never returned to Johan. The email explains the private setup, sandbox boundary, payment purpose and account registration path.

The personal notification task is created for the verified Jorrie principal, including if he registers after the request. Opening it records a read receipt. Completion is derived from the saved verified sandbox connection, not merely from opening or acknowledging the message. Provider acceptance is not an assertion of inbox delivery. If no verified V2 Jorrie account exists yet, platform delivery/read receipts remain pending his registration.

## Approved payment and cost-sharing path

1. A published release, its published company offering and exact commercial version are required. Both principal decisions must match their separately verified account IDs. Partner offers require the current accepted content fingerprint and approved price. Client-submitted prices and legacy recipient percentages are ignored.
2. Sandbox Checkout copies the approved price/currency and immutable commercial allocation inputs. Only Stripe test card payments are supported. Returning to the site is not proof of payment and grants no enrolment, scores, certificates or live access.
3. The webhook verifies Stripe's signature against the raw request body with a five-minute tolerance. Live events are rejected. Event IDs and body hashes are durable; conflicting replays cannot alter the order. Session, order, amount, currency and payment-intent identities must agree.
4. Settlement retrieves the successful captured charge and its actual processor fee. Missing fees, refunds, disputes, mismatched settlement currencies and actual costs below the approved income floor stop automatic payout and require reconciliation. No speculative FX rate authorises a transfer.
5. SQL locks the order and the shared course/developer recovery pool. Approved hosting, actual processor fees, administration and contingency are accounted for first. Development recovery is capped across companies against the approved baseline. Different recovery currencies or changed baselines require reconciliation rather than creating another recoverable pool. Remaining profit follows the signed shares. Owner recovery and partner profit combine when payable to the same company. Every allocated minor unit balances to the confirmed gross payment.
6. Eligible recipient shares become Stripe transfers sourced from the confirmed charge. The transfer account is fixed in the allocation record. A stable idempotency key and a lookup of the durable transfer group prevent duplicate transfers after delayed retries. Accounts, destination countries and Stripe payout capabilities are rechecked before sending. A transfer to a connected Stripe balance is distinct from its eventual bank payout.
7. Webhook retries and an authenticated hourly settlement job revisit eligible ledger entries. The oldest checked time rotates failed items fairly. An authorised principal can also retry. Unsupported destinations and incomplete onboarding remain held. Company administrators have no off-platform payment override. Future providers require their own approved adapter and reconciliation rules.

## Release boundary and validation

This release is V2 sandbox setup and payment wiring. `ALP_PAYMENTS_MODE=disabled`, the existing V1/V2 isolation rules and the prohibition on live Stripe environment keys remain in force. No live account connection, real payment, bank payout, learner enrolment, financial approval or course publication is performed by this release. Jorrie must supply sandbox credentials, configure the webhook and approve his Stripe account settings. A full Stripe sandbox payment/transfer test and a separately reviewed live release remain required before real commerce.

Refunds and disputes place the affected ledger and allocations into reconciliation. This release does not silently reverse recovery or issue bank refunds. A live-release design must include the authorised refund, transfer-reversal, tax, FX, dispute, reserve and bank-payout reconciliation procedures.

Official references: [Stripe cross-border payouts](https://docs.stripe.com/connect/cross-border-payouts), [separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers), [hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding), [restricted keys](https://docs.stripe.com/keys), [webhooks](https://docs.stripe.com/webhooks).
