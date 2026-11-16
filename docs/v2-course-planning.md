# V2 reviewer and course-planning update

16 October 2026. Draft preparation only; V1 is excluded.

Policy creation and revision use separate reviewer email rows. The internal pair
is fixed. Partner reviews require the proposing APGI representative and a company
signatory. Duplicate, invalid and excessive reviewer lists are rejected server-side.

The partner workspace uses APGI and partner terminology. Private internal
distribution and reusable cost estimates have their own principal-only page.
Existing history is retained. Internal default amounts are loaded from the private
database rather than embedded in a public client bundle.

Course preparation records course, brand, current legal owner, development paid
or outstanding, customer source, minimum combined APGI income and a complete cost
profile. New-brand setup returns to preparation after saving branding. The current
tab retains unsaved inputs for up to 24 hours, scoped to the principal and course.
Branding remains accessible independently. This does not change learner access.

Johan's explicit clarifications for working drafts supersede the older illustrative
recovery order: running costs first; administration on costs only; capped recovery
from the entire cost-cleared pool; then the owner/platform split. Third-party
owner-sourced and APGI-sourced defaults remain in place. APGI-owned courses offered
under partner brands need an explicit licence split, rather than silently applying
the third-party defaults. The final agreements must incorporate the revised order
before approval. No earlier PDF, approval or transaction has been overwritten.

The calculator works backwards from the minimum platform income. It uses integer
cents, percentage basis points and a rounding-aware search, caps recovery at the
remaining balance, includes variable processing costs in the gross-up, and refuses
missing cost assumptions. Server recalculation ignores browser-supplied prices.
Higher proposed prices must be recalculated, not merely compared to a stored floor.

Unknown hosting or processor prices are not invented. The profile captures fixed
per-learner allocations, variable costs, processing assumptions, administration,
currency and the allocation period/evidence. Profiles are estimates, not provider
invoices or approved financial rules. No separate fixed hosting/seat subscription
is introduced. See https://stripe.com/pricing for why the processing route matters.

Only the two principals can prepare course plans, edit internal financial drafts
or assign course offerings through the server action. Company owners retain their
scoped branding permissions and cannot acquire publishing or global admin powers.
Return destinations are restricted to known internal preparation routes.

## Explicitly not activated

This release saves planning configurations and frozen human-readable draft
summaries. It does not import new course packages, approve an agreement, turn an
upload into a learner-visible publication, send partner acceptance invitations,
approve on behalf of another representative, change checkout prices, transfer IP
or settle money. The acceptance/rejection message centre, version-bound commercial
approval, controlled publication and real reconciled ledger are subsequent stages.
The internal policy currently remains a draft and is not silently deemed accepted.

Verification: release checks, type checking, production build, and hosted visual
checks are recorded separately in the private handover; a draft calculator is not
certification of legal terms, payment readiness or full workflow completion.
