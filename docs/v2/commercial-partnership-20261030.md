# APGI / SRMS partnership and continuing course rights — 30 October 2026

The owner requested an equal APGI/SRMS platform model, continuing hosting/sales
rights after a client acquires course ownership, reciprocal access limited to
specifically assigned courses, and routine-maintenance/major-upgrade distinctions.
The later instruction was: **keep the originally agreed sharing model**.

## Confirmed implementation scope

- The private internal register already contained a draft with APGI 50 / SRMS 50.
  New internal forms default to 50/50, preserve earlier saved draft percentages,
  and record equal ownership interests separately from residual-profit shares.
  Stripe cost responsibility is APGI; other operating/development cost responsibility
  is SRMS. No additional reimbursement or payout calculation is activated.
- Course preparation and principal commercial views explain that the existing
  APGI percentage is the **combined platform** share. An APGI-only course's 100%
  platform share is not a claim that one company receives all residual profit.
  The private APGI/SRMS settings are linked explicitly.
- New course-plan saves carry `commercial_terms_version=2`. They capture the
  platform joint-ownership definition, continuing hosting/sales permission after
  recovery/transfer, and the separate position for a client that paid in advance
  or a permanently APGI-owned licensed course. No permanent APGI course is promised
  to the client through these clauses.
- Proposed reciprocal courses are an explicit list. The server validates course
  identifiers, uniqueness, current-course exclusion and client-specific restrictions.
  Unknown/restricted courses cannot be smuggled through browser fields. Empty means
  no additional course access; saving does not create offerings or learner rights.
- Routine maintenance is included; major upgrades/redevelopment require separate
  agreement and costing. Existing contingency release rules and minimum ongoing
  platform-income treatment are retained.
- New version-2 plans identify SRMS as the development funder. Recovery remains
  separate from ongoing platform income, capped, and charged on the original
  agreed base. Older saved configurations and their recipients are unchanged.
- New clauses are stored in the exact commercial-version snapshot, included in
  offered-condition summaries and offer messages, and presented under their own
  headings. Private internal notes/distributions remain principal-only.
- A principal may return an **unsent** proposal awaiting APGI sign-off to preparation,
  explaining why. Existing versions/decisions/content clearance remain saved;
  saving a new version requires fresh joint sign-off. This cannot withdraw an
  already sent or accepted offer or reset negotiation counters.

## Deliberately unresolved: additional founder/referral fee

The initial requested 50% founder's fee is ambiguous alongside the preserved
20/80 platform/course-owner split. The owner rejected replacing the original
model. A clarification is pending: on a cost-cleared $100 sale after development
recovery ends, what are the final platform and course-owner amounts, and from
which amount is the additional 50% taken? No additional founder's-fee field is
applied to pricing, recovery, existing terms or payouts by this release.

The original owner-sourced 20/80 and APGI-sourced 40/60 calculations, 25% recovery
from the partner share, minimum ongoing income, cost administration, contingency
and recovery cap remain unchanged. A separate question about how expense
reimbursements relate to internal profit is also pending; cost responsibility is
captured, without inventing a new settlement algorithm.

## Validation

977 release tests passed, one optional test skipped; TypeScript passed. Tests
cover equal-partnership defaults/validation, all three ownership conditions,
continuing rights, original quote/share/recovery preservation, restricted/forged
reciprocal selection, privacy, and a version-safe unsent-proposal revision.
No database migration is required. No stored course agreement, approval, learner
access, ownership transfer or payout is changed by deploying these capabilities.

QA: `C:/Users/Johan/Codex-Work/commercial-partnership-20261030/`.
The distinction between ownership assignment and use permission informed the
draft structure: https://www.wipo.int/en/web/business/assignment-licensing .
These are proposed business terms requiring the platform's normal exact-version
approvals, not a claim that an ownership transfer or licence has already occurred.

Live verification will be recorded after deployment.
