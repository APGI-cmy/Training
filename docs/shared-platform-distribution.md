# Shared platform releases and course distribution

The release registry is `src/data/platform-release.json`. APGI V2 and NKS run one
application version against separate databases and configuration. Mediation Zone
is an APGI V2 workspace; it does not currently have a separate training deployment.
V1 is excluded. Do not copy a partner deployment into V1 to work around a release issue.

## Next-version learning controls

All training on APGI and partner platforms must inherit the same sequential
activity controls in the next platform version. Required buttons unlock in order;
Next remains disabled until the current required activity/summary evidence is
saved, with clear guidance and backward navigation preserved. This is planned
work, not a description of the currently deployed behavior. Existing learner
progress, reviews, certificates and publication state must be retained, and live
payments must remain disabled. See the
[requirements and acceptance checks](../modules/ALP/02-frs/addenda/20261120-sequential-learning-controls-requirements.md)
and the
[requirement registry entry](../modules/ALP/REQUIREMENT_REGISTRY_ADDENDA/20261120-sequential-learning-controls-registry.md).

## Release operation

Prepare source archives from the verified current deployment, preserving all
course media. Each registered project's request must use exactly the same archive
SHA list, source commit and platform version. Build state belongs outside OneDrive.
Upload the archives, then run:

```powershell
python scripts/deploy-shared-release.py C:\Users\Johan\Codex-Work\RELEASE_DIRECTORY --build
python scripts/deploy-shared-release.py C:\Users\Johan\Codex-Work\RELEASE_DIRECTORY --promote
```

Every target must be READY before promotion. The coordinator captures rollback
deployment IDs, refuses concurrent production changes, verifies live version and
disabled-payment flags, and attempts rollback after a promotion failure. Review
`coordinated-release.json` after any failure; never create another release blindly.
Promotions are separate provider operations, not an atomic distributed transaction.
The workflow does not grant financial, policy or course-design approval.

Add future partners to the registry only after binding their project and company,
isolated database, tenant authorization, sender identity and environment guard.
The registry alone does not provision a new production platform.

## Course exchange

New owner offers use a private shelf (`course_distribution`); they do not create
public offerings. The receiving owner accepts explicitly. The source publication,
content fingerprint and approved single-course pricing snapshot are frozen.
The owner's deployed fingerprint must still match the published release.
New commercial versions require a separately consented replacement; do not
overwrite a frozen schedule or an existing learner's edition pin.

The ten-minute message job and the owner refresh button exchange only published
course metadata, owner decisions and coarse security counters. Both deployments
verify Vercel OIDC signatures, issuer, team, audience, project and Production
environment. Registered projects can read only shelves belonging to their hosted
workspaces. Release drift blocks exchange. No service-role keys or learner
records cross databases. Failed exchange remains a retryable failure, not an
empty-success response. Course media must already exist in the common release;
the exchange never writes a publicly downloadable course package.

The central APGI ten-minute scheduler also sends a signed refresh request to each
registered recipient. A recipient performs one local pull, never a recursive peer
refresh or general email-queue flush. Only notifications with the dedicated
`distribution-message:` identity can be claimed for delivery after this refresh;
earlier learner/review queues and provider-accepted messages are excluded. This
keeps course shelves and new sharing notices working even while a
recipient's separate message scheduler is not configured. A failed refresh is
reported as retryable. Enabling a recipient's older email backlog remains a
separate operational decision. Platform principals may invite a production owner
only to that production site's own company; ordinary partner administrators may
not appoint owners, and acceptance never grants global administrator rights.

## Financial boundary

The original approved calculator is unchanged. `sharedCourseQuote` applies its
same route and quantity algorithms to the frozen owner schedule, then consumes
only selling margin. Owner/APGI amounts, platform cost and processing reserves
remain fixed. A partner cannot rewrite shared-course prices through the generic
structure editor. A category wallet cannot extend a single-course licence to
unapproved categories. Publishing a course does not approve or activate pricing.

## Notices and learner continuity

Owner decisions follow concern, final warning, withdrawal. Separate response
deadlines must expire before escalation. A resolved concern can be closed without
withdrawal. Each decision creates an auditable conversation, personal notification
and tracked mail delivery. Retries retain the same message identity. No suspicion
automatically revokes a course.

At withdrawal, active enrolled learners receive a continuity record. The offering
is archived for new business; new invitations and enrolments are rejected. The
tenant and asset gates still admit the entitled original learner, subject to the
original expiry, pin and normal session/assessment checks. Withdrawal does not
revoke, extend or move learner accounts. Separate legitimate learner revocation
remains possible. Alternative production access is arranged with the administrator
and appropriate consent, never by copying learners into V2 staging.

Twenty verified-user file denials in a ten-minute window generate a deduplicated
owner investigation message. Monitoring contains course/count/time metadata,
without names, IPs, tokens or media paths. Screen capture cannot be prevented
absolutely; this is access control and monitoring, not a promise of uncopyable media.

## Policy and checks

`src/data/course-sharing-policy.json` contains the draft policy, saved as a draft
in both policy workspaces. Johan and Jorrie retain policy and financial approval.
Tests cover authorization, partner margin floors, issuer/project scope, release
drift, private shelf acceptance, three notice ordering/deadlines, no new enrolments
after withdrawal, continuing learner entitlements and idempotent exchange. Database
scenario tests must run within a transaction that is rolled back, without calling
the email dispatcher. Existing learner, progress, certificate, price and review
evidence must be compared before and after release.
