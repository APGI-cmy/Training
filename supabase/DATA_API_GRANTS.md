# Explicit Data API permissions

Supabase's [October 30 change](https://github.com/orgs/supabase/discussions/45329)
removes automatic Data API grants for new tables in `public`. Existing table
grants remain unchanged. RLS policies alone do not grant access to a table.

`20260923124226_explicit_data_api_grants.sql` adds a fixed, reviewed access list
for the current learning portal, including the catalogue migrations. It preserves
existing privileges and policies. It does not restore automatic grants.

- Authenticated access follows the existing RLS operations. Learners cannot
  directly insert enrolments.
- Anonymous reads are granted only for the four public catalogue tables.
- Invitations and assessments remain backend-only; append-only event tables
  receive backend SELECT and INSERT.
- The Scannex theory-attempt migration already grants its backend access
  explicitly; the regression test verifies that it remains private.
- Each listed table must have RLS enabled. Unexpected object types cause the
  whole migration to roll back. Tables absent from a partial deployment are
  reported and skipped; if added later, grant access in that table's migration
  or reapply this grant migration after reviewing the notices.

For every future Data API table, add explicit per-role grants in the migration
that creates it, alongside RLS and policies. Include `service_role` where the
backend uses the Data API: bypassing RLS does not bypass table privileges. Grant
anonymous access only when the feature requires it. Grant sequence USAGE if a
future insert relies on a sequence; the current application uses UUID keys.
See [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

## Verification

Run `python scripts/test-data-api-grants.py` with Python 3 and Docker. The same
check runs in the Data API grants workflow for migration changes. It creates and
removes a disposable Postgres 17 container with no network access or host mounts.
No hosted database credentials are accepted.

The test replays the migration history without automatic grants, proves the
missing-grant regression, applies the repair, and exercises real database roles.
It checks row isolation, backend-only tables, idempotency, preservation of RLS and
defaults, exclusion of future private tables, and atomic refusal when RLS is off.
Auth and Storage use minimal local fixtures; this is a database test, not a
hosted PostgREST or browser end-to-end test.

## Deployment

Review and merge the migration through the normal repository process, then apply
it using the project's database deployment process. Review pending migrations
before deployment: applying the entire queue may include unrelated changes.
Existing hosted tables do not require an emergency change for this notice.
This migration does not alter data or revoke existing access. Do not undo it by
blindly revoking privileges, because a privilege may have predated this migration.
