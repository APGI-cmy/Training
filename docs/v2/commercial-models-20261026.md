# Course ownership, sharing and development recovery

User clarification on 26 October 2026 separates ownership, ongoing platform
income and development recovery. This change applies to new V2 commercial
versions; it does not amend earlier approved schedules or enable payments.

## Ownership conditions

The course plan requires one explicit selection:

1. APGI owns the course indefinitely.
2. APGI owns it until the approved development price is fully recovered; then
   the named client becomes the owner.
3. The client paid in advance and owns it from the outset.

Option 2 names the receiving client, records the full price, the amount already
paid/recovered and the remaining balance. It requires APGI as current legal
owner and an outstanding recoverable balance. Option 3 requires the client as
current owner and development already paid. Existing workflow owner/brand locks
remain; a different recorded owner or partner requires a new review.

For Tiger Kidnapping, the agreed condition is option 2 with a 25% recovery rate.
No live commercial draft or agreement was selected, saved, signed or sent on the
user's behalf during this change. Saving a plan records proposed conditions; it
does not itself execute an ownership transfer. Verified recovery accounting must
support the eventual transfer. Live settlement/transfer was not tested because
V2 payments remain disabled.

## Sharing choices

- Course owner / partner supplies the customer: APGI 20%, partner 80%.
- APGI supplies the customer: APGI 40%, partner 60%.
- Tailored model: entered APGI percentage, calculated partner remainder, and
  required explanation. The exact percentages and explanation are shown in
  the draft review, principal terms and offered partner conditions.

Temporary APGI ownership under option 2 permits standard partner splits.
Permanent APGI ownership licensed under another brand still requires a tailored
schedule. APGI-owned, APGI-branded internal courses retain their separate basis.
Legacy partner drafts restore standard percentages as standard, rather than
automatically ticking an empty custom-share override. Missing-input messages
identify the relevant field/step; Continue is unavailable until a quote is valid.

## New partner recovery calculation

Clear operating costs, cost-only administration and the cost reserve first.
Set aside APGI's ongoing platform share of the cleared pool. Deduct recovery
only from the partner's share, capped at the outstanding development balance.
Recovery is additional to ongoing APGI income and never reduces that income.

For a cleared pool of 100 and an ongoing 20/80 split:

| State | APGI ongoing income | Development recovery | Client income |
| --- | ---: | ---: | ---: |
| Recovery outstanding | 20 | 20 (25% of 80) | 60 |
| Only 3.50 still outstanding | 20 | 3.50 | 76.50 |
| Fully recovered | 20 | 0 | 80 |

In the 40/60 model the corresponding uncapped recovery is 15 (25% of 60),
leaving the client 45. The pricing floor protects ongoing APGI income excluding
recovery, and no longer rises solely because a development balance is outstanding.

New partner configurations store `recovery_base=partner_share`; their immutable
payment snapshots carry `recoveryBase=partner_share`. Earlier missing/explicit
`cost_cleared_pool` schedules preserve their original arithmetic and require a
new commercial version and approvals to adopt the corrected rule.

## Verification and release

- 720 release tests passed across 70 files; TypeScript passed.
- Browser checked a restored legacy standard draft, 20/80 and 40/60 choices,
  tailored reason validation, automatic remainder and final ownership summary.
  The local check used sample data and made no save request.
- Browser confirmed the corrected floor and separate ongoing/recovery amounts.
- V2 migration `20261026065726_v2_partner_share_recovery_basis.sql` applied and
  verified. A pure allocation helper is shared by publication pricing checks and
  settlement under its existing recovery-pool lock. Exact installed-function
  replacement guards preserve all existing approval, identity and release gates.
- SQL verified 20/20/60, capped final recovery and 20/0/80 after repayment.
  The helper, publisher and allocator remain invoker functions with an empty
  search path, service-role execution only and no public/authenticated access.
- Security advisors had the same pre-existing findings before and after this
  migration; no additional finding was introduced. Existing advisory references:
  [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
  [function security](https://supabase.com/docs/guides/database/functions), and
  [password protection](https://supabase.com/docs/guides/auth/password-security).
- Temporary browser-check source was removed before deployment. Ephemeral QA
  evidence is outside OneDrive at `C:/Users/Johan/Codex-Work/commercial-models-20261026`.
