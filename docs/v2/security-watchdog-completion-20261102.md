# Security Watchdog: identity, network and recovery controls

## Scope and evidence

This release strengthens APGI Training V2 only. Course content, learning progress,
review records, commercial terms and V1 are outside the change. The dashboard
continues to report the proportion of named checks passed, with coverage gaps
included in the denominator. A high score is not a guarantee that no information
has ever leaked. Suite v4 is kept separate from earlier suite trend percentages.

Implemented controls:

- Administrators, course publishers and current company owners must enrol their
  own authenticator and complete AAL2 before protected workspaces open. Own
  authenticator setup and activity renewal remain accessible during enrolment.
- The same requirement is enforced by restrictive database/Storage policies and
  the direct course-file gate. Existing permissions still apply after step-up;
  MFA does not grant a new role or company membership.
- Atomic, shared login budgets use keyed hashes of the account and trusted edge
  address. Raw addresses, passwords and tokens are not retained. Account limits
  are eight attempts per fifteen minutes; edge-address limits are sixty per five
  minutes. Authenticator verification allows six attempts per five minutes.
- Password recovery now offers the existing authenticator check before password
  replacement. Recovery remains separate from ordinary platform sign-in. A reset
  neither removes MFA nor allows a password-only session into admin workspaces.
- Server HTTP calls use a fixed-provider adapter with credential-family checks,
  redirect rejection, no-store caching and a maximum twenty-second timeout. The
  same-origin synthetic HTTP probe is a separately constrained exception. An AST
  audit runs before every build and rejects unreviewed network calls/imports.
- Project WAF rules deny the exact harmless canary URL and TRACE/TRACK/CONNECT.
  An authentication burst rule observes 120 POSTs/minute/address in log-only mode.
  Review observed traffic before changing it to enforcement, particularly for
  classroom users sharing a connection. Application login budgets enforce now.
- The dashboard adds a network/outbound category. Named checks cover a blocked
  pending administrator, successful AAL2, concurrent login counters, outbound
  destination rejection, certificate eligibility and paired edge controls.
- A private one-pixel PNG is backed up in memory, deleted, confirmed absent,
  restored and checked by SHA-256. The object and all identity fixtures are removed.
- Policy/certificate regression cases cover own/assigned/foreign/revoked access,
  private internal policy boundaries and certificate validity/tampering. Live
  immutable policies and valid certificates are not fabricated to obtain a pass.

The live disposable-identity integration check also confirms that password
recovery retains MFA, a used recovery link cannot be replayed, and provider logout
revokes the session. Credentials and authenticator secrets remain in memory.

## What APGI still needs to complete

| Area | Next concrete action | Responsible party |
| --- | --- | --- |
| Real administrator enrolment | Jorrie privately enrols and verifies his authenticator under My account security. The prior reminder was sent; receipt/enrolment is not assumed. | Jorrie |
| Full recovery | Approve a separately priced recovery environment and the private Storage backup destination; then perform the drill below. | APGI operations / owner |
| Independent assessment | Give an independent assessor the scope and acceptance conditions below. | APGI / independent assessor |
| Retained external logs | Select an approved log destination, retention, access controls and budget; connect and test provider log drains and external evidence anchoring. | APGI operations |
| DLP and integrations | Define allowed information classes/recipients, test the selected DLP service, and repeat the checks when AI, live payments or Viewer are enabled. | APGI / service owners |
| Complete route coverage | Extend real role/record tests to every server action and production-only integration, including full browser recovery. Unit ACL cases do not equal exhaustive live verification. | APGI development / assessor |
| Organisation controls | Approve risk ownership, incident handling, supplier review, staff awareness and evidence review. An automated test does not confer ISO certification. | APGI management |

## Separate-environment recovery drill

1. Obtain an exact cost estimate and owner approval before creating a recovery
   project. Never restore over V1 or the working V2 database. Do not repoint the
   public app or DNS to the recovery system.
2. Record the selected backup date, source/target identities, start time and
   approved recovery objectives. Database backup and Storage objects require
   separate coverage: the database backup does not contain Storage file bytes.
3. Restore into the approved isolated target. Keep email, payment, Viewer, AI,
   public signup and outbound jobs disconnected; remove copied provider secrets
   before exposing any application. Use new scoped recovery credentials.
4. Independently restore private Storage files from the approved encrypted copy.
   Compare bucket privacy, object counts, paths, sizes and hashes without placing
   customer file content in the public report. Verify no foreign-company access.
5. Compare schema/migration identity, row counts and protected review/commercial
   record digests. Exercise representative sign-in/MFA, own-company access,
   denied foreign access, learner progress and private-file download paths.
6. Record recovery duration, latest recoverable timestamp, failures and corrective
   actions. An APGI owner and an independent checker sign off the evidence.
7. Revoke recovery credentials, preserve approved evidence and handle disposal
   under an explicitly approved retention plan. No real data deletion is part of
   the automated synthetic Watchdog drill.

## Incident and assessment handover

On an unexplained failed separation check, restrict the affected feature and
preserve the signed report, deployment identity and provider logs. Notify the
designated APGI security owner, determine affected accounts/companies, revoke
compromised sessions and rotate credentials where warranted. Keep a dated
decision record and retest the fix before restoring the affected feature.
Communications and any legal notification decision need an authorised owner.

Independent assessment scope: authentication/recovery/MFA, every role and tenant
boundary, invitation and revocation paths, stored/direct files, exports, server
actions, caches, background jobs, webhooks, dependency/supply-chain controls,
provider configuration, outbound flows, incident escalation and full recovery.
Require reproducible evidence, severity/ownership, remediation and independent
retest. Start with synthetic accounts and obtain separate written scope before
using any real customer records or disruptive load tests.

For other APGI applications, reuse the lifecycle and reporting concepts with
validated application-specific role, tenant, asset and provider adapters. Do not
copy V2 identities, credentials or staging-only allowances into another app.

## Provider references

- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Restore to a separate project](https://supabase.com/docs/guides/platform/clone-project)
- [Vercel Firewall](https://vercel.com/docs/vercel-firewall)
- [Trusted Vercel request headers](https://vercel.com/docs/headers/request-headers)

The small synthetic restoration is not a substitute for the separate recovery
drill. No new paid recovery resource, independent assessment, external DLP service
or external log-retention provider was purchased or represented as completed.

## Verified live release

- Application source: `d07e802a55f17b8edc9b40d05d3f2d6b789194f2`.
- Canonical deployment: `dpl_h8Ku4p5eyLCvDKBMkE8tXhPqhcLf`.
- Signed run: `accf8b87-b320-490f-8cd2-9165fcac38ba`, completed 2 November
  2026, 17:50:13 SAST. Suite v4: **69/75 named checks passed (92%)**, no failed
  or inconclusive checks, one enrolment attention item and five explicit gaps.
- Both new administrator MFA controls, the concurrent login budget, outbound
  adapter, certificate refusal, paired WAF routes and private-file restoration
  passed against the deployed application. MFA-enabled recovery passed using the
  actual helper and a disposable provider identity; no real password was changed.
- The provider security advisor returned zero current notices. This is a provider
  configuration result, not an independent penetration test or ISO assessment.
- All temporary identities, enrolments, message threads, canaries, files and
  fixture counters are gone. Totals remain 28 users, 16 companies and 12 memberships.
- Review rounds remain three with digest `805c8c58104260ad5042deb61e10c9c2`.
  Commerce settings remain two with digest `21ed13ec61b393c9db9e8f3236a18fb4`.
  All four course fingerprints match the previous deployment.
- Local verification: typecheck, application build, outbound AST audit, 98 Watchdog
  tests and 1,006 learner-release tests passed; one existing test stays skipped.
  The production dependency audit reports no vulnerabilities.
- The signed live evidence verifies against retained trusted key
  `a08bdf54532bf8c3b4ab6932`. Its PDF rendering has seven visually checked pages
  with all body text clear of the footer. The rendering uses the deployed source
  generator and verified database evidence; it is not a newly authenticated export.
- The owner's browser session expired. A sign-in request remains pending, so a
  fresh authenticated dashboard/download check and the earlier embedded-player
  observation remain unconfirmed. No course engine or package was altered here.

Evidence and the recovery preparation are retained in
`C:/Users/Johan/Codex-Work/watchdog-completion-20261102`. Database migrations
`20261102151813` and `20261102154323` are applied in V2. The latter adds the
expiry-cleanup index after the application build; it needs no new application
deployment. The earlier LU1 line-ending-only workspace changes were neither
committed nor included in the deployment archive.
