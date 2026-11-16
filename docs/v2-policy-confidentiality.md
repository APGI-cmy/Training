# V2 policy alignment - confidential governance boundary

16 October 2026. First alignment release, V2 only.

## Restricted internal governance

`platform_principals` reserves exactly Johan Ras and Jorrie Jordaan's designated
business mailboxes and binds each to a stable verified administrator UUID.
Ordinary global-admin status, a matching display name, user metadata or a policy
reviewer assignment cannot grant principal access. Email changes and removal of
the admin role cause the principal check to fail. Replacing an already bound UUID
requires a controlled identity review; an ordinary company or policy action cannot
replace it. An unbound reserved mailbox is bound only when its verified account
receives the admin role. No new user or administrator role is created by the
migration. Jorrie's V2 account was not yet present at release preparation.

Internal policies have `visibility=internal` and no organisation ID. Only principals
can list/read/download them, create or revise policies, submit/retry notifications,
or read/write the commercial-draft workspace. Internal reviewers and notification
recipients are limited to the two principals, and submission requires both.
Decisions still require the exact verified reviewer identity and document version.
Scope and company cannot change on revision. Submitted history is immutable.

The checks are server-side, not just hidden links. Other administrators do not see
the commercial-draft navigation or confidential policy creation form. Private PDF
storage, download hash checking and private/no-store responses remain in place.
Direct client grants are not introduced; new principal functions are server-only
and SECURITY INVOKER, with no anon/authenticated execution grant.

## Separate company agreements

Company policies require a company ID. Their new review sets contain the proposing
APGI representative plus at least one explicitly named company signatory; the two
internal signatories are no longer automatically copied onto external agreements.
Company owners can read their own company records and assigned reviewers can read
their specified agreement. Revoked owners remain denied. A company agreement must
contain only the relevant APGI/company terms, not internal partnership allocations.
Policy approval does not activate money.

## Migration and preservation

Migration: `20261016074924_v2_policy_confidentiality.sql`, applied only to
`eaaqgtdpvbxdgjxphjie`. Existing policies are classified from their immutable company
scope; their PDFs, hashes, decisions and statuses are preserved. Original internal
drafts remain drafts. No invitations or review emails are sent by the migration.
V1 database `ooujszdvncwijbuzpjfp`, its hosting project and existing learners are
excluded. V2 payments and Viewer streaming remain disabled.

The earlier review PDF is removed from the current V2 repository tree and preserved
outside the checkout. Generated PDFs are ignored. This repository is public: that
removal does not erase earlier public Git history or copies. Repository visibility
and historical exposure require a separate decision; application access controls
cannot make previously published material confidential retrospectively. No new
policy document or commercial agreement is committed as part of this release.

## Verification and remaining work

Release checks include another global admin, owner, learner, assigned reviewer,
revoked owner, anonymous request, unavailable principal lookup, forged user metadata,
internal policy list scope and private PDF download denial. Live SQL checks roll
back all test effects and verify principal submission, rejection of an outsider
admin, exclusion of an external internal-policy reviewer and an exactly two-person
review outbox. A passing build or these checks are not a claim of financial-policy
compliance or complete authenticated browser acceptance.

Next alignment phases remain company-scoped learner invitation/enrolment/group and
progress controls; mandatory ownership declarations; approved cost/recovery/purchase
ledgers and transfer notifications. Unapproved rates, financial flows and external
company schedules must not be activated by this release. The latest internal PDF
may be filed as a restricted draft after hosted permission checks; filing is not
approval and sends no notifications.

Provider security scan: no new security ERROR. Existing warnings about the three
role/invitation helper functions and leaked-password protection remain separate.
Server-only tables intentionally have RLS with no client policy or client grants.
See https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
