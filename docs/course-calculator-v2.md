# Versioned course calculator and learning balances

V2 only. Live payments remain disabled by the existing environment isolation,
test-only Stripe vault/request adapter, explicit payment checks and database
constraints. New purchases create test balances, never live enrolments or
certificates. V1 is not a deployment target.

## Entry points

- `/course-calculator`: APGI principals and assigned company owners. Company
  selection is checked on the server; other administrators do not gain blanket
  calculator access. The company workspace and navigation link here.
- `/learning-balances`: the current learner's assigned places, authoritative
  credit/money balances and retained history. Redemption is transactional.
- `/pricing-policy`: the platform-wide proposed/approved policy and recorded
  effective status, readable by authenticated platform users.

## First configuration

1. Preserve the existing costing records. In the calculator choose a saved
   costing record as evidence, separate the shared MONTHLY pool from usage ONCE
   per enrolment and processor fees, then record concurrent active learners and
   new monthly paid enrolments. There is no assumed minimum volume or hard-coded
   monthly cost. Save a new version; quotes still need separate approval.
2. Record justified notional hours and owner minimum prices per retained course
   edition. Ten hours correspond to one internal workload credit. Do not guess
   existing course ratings or represent them as accredited awards.
3. Both verified principals review the same pricing-policy version, recording
   their own approve/reject decisions. A principal then explicitly publishes the
   approved version; this records the effective date. No decision is inferred.
4. APGI/company owner chooses Credits or Courses, eligible editions, scope,
   purchase route, learner places, term, fees and documented direct costs where
   applicable. Selecting courses adds their credits automatically.
5. Save an immutable quote. Both principals must approve its exact version.
   Rejection requires a corrected new quote. The company owner separately
   accepts the quote for sandbox checkout. Every course must already pass the
   existing publication/content/branding/commercial checks for that company.
6. Existing development-recovery contracts keep their original price and basis.
   A course with outstanding recovery is blocked from new-calculator checkout
   until a separately approved replacement recovery schedule is implemented;
   it cannot be silently reinterpreted or bypassed through a wallet.
7. The signed sandbox webhook verifies the payment intent and funds the places
   once. Company owners assign places to verified company members. Learners
   redeem eligible courses; credits, content money and recipient allocations
   are recorded atomically. Retries cannot double-spend the balance.

## Allocation and cost controls

Own course: owner/seller80 APGI20. APGI-course resale: selling platform80 APGI20.
Third-party shared course: owner80 selling platform10 APGI10. Rounding retains
exact cents; APGI roles consolidate where it fills several roles. Wallet content
funds stay unallocated until an actual course is redeemed. The owner floor is
binding. An allowance that cannot be used under its course cap is rejected.

Shared monthly recovery uses concurrent active learners and months of access.
Per-enrolment usage is charged once. The forecast shows over/under recovery
against the monthly pool. No reverse-calculated price is relabelled a known cost.
Cost-plus uses the recipient's actual share. Actual processor/FX evidence is
reconciled using the existing verified-fee logic, with scheduled retry; correct
payment receipt is acknowledged even while fee evidence is pending.

The APGI/SRMS internal cost and 50/50 residual-profit agreement remains in the
private existing financial workflow. New sandbox allocation records are not
external transfers or a replacement for approved actual-cost reconciliation.
Taxes are not implemented by the calculator and the result is explicitly before
tax. Subscriptions are prepaid fixed terms, not automatic recurring charges.

## Preservation and rollback

The migration creates only `cc_` tables/functions. It does not update historical
prices, reviews, policies, enrolments, results or old Stripe orders. Quotes freeze
policy/cost/credit versions. Core mutations are service-role-only SECURITY
INVOKER functions; all `cc_` tables have RLS and no direct browser grants.

Roll back the application to the recorded prior V2 deployment if required; leave
the additive tables and their history intact. Never roll back or delete earlier
course data. Preserve test payments and balances for audit. Stop a route through
application rollback rather than editing a saved quote or erasing a ledger.

## Verification

Pure financial tests; mocked verified-payment and fee-retry tests; existing
Stripe regression suite; actual PostgreSQL migration/RPC/permission tests,
including competing simultaneous redemptions; isolated application build;
deployment/status checks and browser checks. Test data stays in a separate local
PostgreSQL database, never in the hosted learner records.


## Category purchasing-wallet proposal — 18 November 2026

`category-wallet-2026-11-18.1` is an optional marker on a new structure, not a
rewrite of the 2026-11-17.3 model. Historical structures without the marker use
the original quoting, funding and redemption dispatchers. The new policy is
`APGI-COMM-PRICE-001/1.4-draft`; decisions and activation are separate owner steps.

The wallet catalogue is independent of the named-course buying pool and contains
ready recorded editions with published company offerings. Select one or more
categories, buy total purchasing credits with the slider, and set named learner
capacity separately. Courses are selected on redemption. Purchasing-credit face
value is USD1; learning credits remain workload measures. The exact combined
average is weighted by course count. Whole course equivalents drive the existing
bulk discount, beginning at ten equivalents and capped at 50% from 1,000.

Platform service and processing remain outside the spendable credit balance.
Every named place receives a deterministic share of face credits and actual
content cash. Course/owner floors and integer rounding may limit the discount.
Cumulative proportional cash accounting prevents overspend and allocates only
actual discounted cash. One-place purchases are assigned to the buyer; company
managers assign multiple places. Private-category access and verified policy/
structure approvals are checked before checkout. Existing refund/hold and expiry
controls remain in force; all new records and payments are sandbox-only.

The buyer portal obtains dynamic quotes from the authenticated, private/no-store
`/api/category-wallet-quote` endpoint. It returns public totals and eligible course
requirements, not raw cost evidence or recipient percentages. The cart action
recalculates each quote and its fingerprint on the server. No new approval or
funded entitlement is inferred by previewing or saving a proposal.

Producer checks include the calculator tests and
`scripts/qa/category-wallet-transaction.sql`. That SQL test uses a transaction-local
approval mock and fixtures, then rolls everything back; it is not an actual
payment or an approval of the production proposal.
