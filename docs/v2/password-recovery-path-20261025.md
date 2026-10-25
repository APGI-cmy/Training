# Forgotten-password and unfinished-signup recovery — 25 October 2026

## Confirmed cause

The affected recipient had an active, unredeemed APGI V2 administrator invitation
but no `auth.users` account in V2. The invitation itself had not expired.
Supabase's recovery-link generation returned account-not-found. The fallback
rotated and resent the ordinary administrator invitation, which opened a page
whose primary action was Sign in. This created a circular experience for someone
who had not created a separate V2 password.

This was not a forgotten password expiring. No affected user's password, account,
invited role, company, course, expiry, or privileges was changed during the repair.

## Resulting behaviour

- Existing V2 account: the standard reset email opens `/reset-password`; link
  verification uses a POST, then a short-lived HttpOnly recovery session permits
  the account owner to choose and confirm a new password.
- Active invitation, no V2 account: send a distinct “Set up your APGI Training V2
  password” email. Its button opens `/register?token=…&setup=1` directly. The
  recipient chooses and confirms their own password without signing in first.
- Email confirmation remains mandatory. After signup the screen clearly directs
  the recipient to confirm their email before signing in or completing Profile.
  Saving Profile applies only the existing valid invitation.
- Older ordinary invitation links also show “First time on V2? Choose my
  password” as their first action, with separate existing-account sign-in and
  forgotten-password choices.
- Unknown/uninvited addresses get the same generic public acknowledgement;
  no account is created and no role granted by a recovery request.
- Recovery keeps its existing budget, active-invitation checks, concurrent token
  rotation guard, audit, original invitation expiry, and separate V2 scope.

The successful setup-email audit now distinguishes `account_setup` from an
ordinary `invitation`. Generating or receiving a link does not grant access.

## Verification

- Type checking and production build passed.
- Normal release suite: 661 tests in 65 files passed.
- Explicit provider integration test passed against the isolated V2 database:
  account-not-found selected direct setup, signup confirmation verified, no admin
  role granted, reset token exchanged, password updated, new-password sign-in
  succeeded, old-password sign-in failed, and token reuse was rejected.
- Provider testing used generated `.invalid` fixtures with external email
  delivery intercepted or privately captured. Real-user accounts changed: zero.
- Fixture accounts were soft-deleted, fixture invitations revoked, and private
  captured links removed. An initial fixture-cleanup DELETE was correctly blocked
  by retained invitation audit events; cleanup uses revocation instead.
- All 82 course MP4s verified as real media objects before deployment.
- No schema or RLS changes. Advisor notices were the existing service-only RLS
  tables without public policies, signed-in role-helper definer warnings, and
  disabled leaked-password protection; none caused this recovery loop.

Provider test source: `tests/v2-password-recovery-integration.spec.ts`. It is
excluded from normal release tests and runs only via the explicit staging config.
The machine-local QA report contains pass/fail checks only, with no passwords,
access tokens, or usable links.

No recovery email was sent to the affected recipient during engineering QA.
The recipient should make a fresh request after the release, choose their own
password, confirm their email, and save Profile. Their successful real sign-in
remains a recipient acceptance check.

## Live release

Functional commit `d6aba9cdfa204a6e9ebee7cd15cb695b1de0b58b` was deployed to the
verified V2 project and promoted as `dpl_GziEnRtvcMKESJvH2RAbCBPb7pGv`. The canonical
V2 alias resolves to that READY / PROMOTED deployment. V1 was not changed.

The live recovery form returned the updated generic acknowledgement for a
fictional, uninvited address. Anonymous HTTP access returned 200 and included the
direct-password-setup explanation. The live setup screen showed Email, Choose a
password, Confirm your password, and Save my password and send confirmation,
without requiring sign-in. This visual check used a nonfunctional QA marker in
the token parameter and did not submit credentials; actual token validation and
credential changes were verified separately by the real-provider fixture test.

Evidence: `qa/password-recovery-20261025.jpg` and
`qa/password-setup-20261025.jpg`. The live recovery page was left available to the
user for a fresh request. The affected invitation remains sent and unredeemed;
the affected V2 account has not been created on the recipient's behalf.
