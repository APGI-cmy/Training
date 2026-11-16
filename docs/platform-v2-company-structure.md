# V2 company and policy structure

Structural release, 15 October 2026. Commercial policy feedback is pending.

## Release boundary

Only `v2-development`, Vercel project `training-platform-v2-staging` and Supabase project `eaaqgtdpvbxdgjxphjie` are targets. Version 1, its database and its learners are excluded. Payments and Scannex streaming remain disabled in V2. Existing V2 transactional email remains enabled.

## Available workflows

- `/admin/companies`: create companies, open their workspaces and assign one shared course to multiple companies. The former Branding and Organisations pages redirect here.
- `/company`: switch between authorised company workspaces. Owners may update their company's name, logo, colours, support email and one of ten certificate designs. APGI remains the hosting reference. Course enrolment determines the learner's course brand; switching workspaces cannot move an existing enrolment.
- `/company/[id]`: APGI administrators appoint or revoke company owners, assign course offerings and respond to change requests. Owners can submit requests but cannot change APGI settings, course content, enrolments or commercial terms. Owner invitations require the exact verified recipient email and a saved profile; redemption creates a company membership, never a platform-admin role.
- `/admin/policies` and `/policies/[id]`: store a private PDF and its SHA-256 fingerprint, create versions, nominate reviewers, submit for review and record explicit approve/reject decisions. Johan Ras and Jorrie Jordaan are included as required reviewers by application policy creation. Additional company reviewers can be named. Submission sends real review emails; saving a draft does not. Opening a link records no decision. Any rejection closes that version; revision creates a new version and fresh decisions. Required reviewers must each approve before a version becomes approved.
- `/admin/agreements`: optional draft fields for course ownership/shares, development recovery, operating costs, administration and internal distribution. Blank amounts and percentages remain null. These records have no operational effect: no checkout, charge, royalty, recovery ledger, payout or financial activation is present.
- `/admin/email-templates`: preview company-branded invitations with the real course cover. Actual invitation mail uses stored invitation, course and company data; this preview sends nothing.

## Pending review document

The previously shared **APGI V2 - Branding, revenue and approval framework**, Review draft 0.1, is privately filed as policy `c0d2b0c1-0345-4dba-9050-74ab9c5ca42c`. It remains an unsubmitted draft. PDF SHA-256: `a185286a0c51cd9d8c9b513ef3e583a2ba21b820a32c72dfaac674acbeb4cb52`.

Do not submit or approve this document on behalf of its reviewers. The future monetary engine, agreement-to-policy activation, allocation ordering, refunds/reversals, recovery balances, accounting exports and scheduled distributions require the agreed policy and a separate implementation. Policy approval alone cannot activate money in this release.

## Security and preservation

Pages authorise before reading or serialising private data. Company and policy server actions repeat scope checks; browser-submitted organisation IDs are never sufficient authority. New governance/financial tables are server-only under RLS. Membership reads are limited to the signed-in user's own rows. Owner and policy RPCs are executable only by the service role and validate the named actor, verified email and current state. Revoked owners lose company and company-policy access. PDF downloads require an authorised session and verify the stored file hash. Submitted document content, reviewer sets and decisions are locked by database controls.

The existing unique user/course enrolment rule remains: the same person cannot be silently re-enrolled under another company's branding. Such a transfer or multiple registrations for the same course needs an explicit future workflow. Existing PowerPoint/SCORM artwork may contain its original APGI graphics; the website's branding does not rewrite embedded course media. Changing a brand or certificate design does not replace previously issued certificate assets.

## Database changes and verification

- `20261015082124_v2_company_workspaces_and_policy_structure.sql`
- `20261015084536_v2_preserve_enrolment_company_identity.sql`

Both applied only to the V2 project. Validation: 189 learner-release checks, 36 established enrolment regressions, 10 opt-in real V2 integration checks, TypeScript and production build. Integration fixtures use fictional `.invalid` identities, disable email in the test process and never exercise payments. The integration suite is intentionally excluded from ordinary CI; it requires explicit V2 configuration and provisions fictional records. Private test artifacts and credentials stay outside Git.

The V2 advisor scan found no security ERROR. Existing password-protection and helper-function warnings remain separate from this structural change; intentional server-only tables appear as informational RLS-without-client-policy notices. Live deployment and browser checks are recorded in the release handover.

