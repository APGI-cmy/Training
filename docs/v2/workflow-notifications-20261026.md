# Review workflow destinations and actionable notifications

## Behaviour

- Tracker boxes are navigation links. A separate expander shows their sub-tasks.
- Commercials have a dedicated `/course-reviews/[id]/commercials` workspace.
  Pricing, the two principal signatures, assigned reviews, saved comments and
  earlier versions have distinct destinations. Tracker identifiers are scoped
  to the task, so report, branding and commercial statuses cannot collide.
- Final content clearance belongs to step 6.1, outside commercial preparation.
- Both verified APGI principals can read the full saved principal schedule.
  Company reviewers retain access to the offered company version; internal
  schedules and unoffered principal comments remain private.
- Saved assigned-review comments remain visible with author, version and date,
  including earlier versions. Discussion proposals support optional price,
  APGI-share and recovery suggestions. They are non-binding, version-bound and
  do not amend terms, consume partner negotiation rounds, sign off, publish or
  send email. Formal decisions retain the existing prerequisites.
- Notifications have permanent sequential references, a description of the
  requirement and an exact destination. Outstanding tasks are projected from
  the verified user's actual review assignments and saved outcomes. Earlier
  general reminders remain readable history rather than duplicate actions.
- Matching references appear beside outstanding actions and a selected update.
  Reading stays separate from completing an action. Completed or no-longer-
  required requests retain their references and read/response history.

## Validation

- TypeScript passed; 812 release tests passed across 81 files.
- Database transaction checks ran as `service_role` and were rolled back:
  idempotent projection, stable reference, read receipt without completion,
  resolution/history retention, same-user lookup and workflow immutability.
- New functions use security invoker with an empty search path; `anon` and
  `authenticated` have no execute privileges. Existing RLS and role grants
  were not weakened. Security advisor findings match the pre-change baseline.
- Supabase CLI 2.122.0 generated migrations; filenames match the applied V2
  migration versions. V2 project: `eaaqgtdpvbxdgjxphjie`.
- 82 MP4 assets verified as real media; Git LFS objects materialized.
- No course player, course identity, price formula, ownership condition,
  independent approval requirement, learner record or email outbox changed.
- Source remains in the physical V2 worktree outside OneDrive. QA files are
  under `C:/Users/Johan/Codex-Work/workflow-notifications-20261026/`.
- Actual review writer verified in the same rolled-back transaction: advisory
  proposal saved, revision incremented, commercial terms and approval outcomes
  unchanged, and no email queued.

## Release and live verification

- Application commit: `8c310e3829711fb89ccfbe5bfa74ab7662112d80`.
- Vercel deployment: `dpl_5SpGfKWK38q62vL9jFw5caeanzyJ` (READY).
- Exact commit and V2 project checked before promotion. Canonical alias:
  `https://training-platform-v2-staging.vercel.app`.
- Signed-in administrator browser checks confirmed:
  - Main commercial tracker box opens the dedicated commercial workspace.
  - A separate expander opens/closes the tasks without navigating.
  - Pricing and individual principal sign-offs have correct destinations and
    matching status numbers. All rendered same-page tracker anchors exist.
  - Both the existing assigned commercial comment and formal decision are
    visible with their version and recorded date. No sample feedback submitted.
  - A historical commercial-review notification opens its exact saved comment
    with the same numbered reference displayed alongside it.
  - A pending revision notification opens pricing with the same reference;
    reading records a receipt while the required response remains outstanding.
  - Final content clearance is present on the main review page, separate from
    commercial preparation.
- Principal identity/role was verified for the second APGI principal. Its
  access path and company-reviewer boundaries are covered by regression tests;
  no impersonation or sign-in to another person's account was performed.
- Runtime error/fatal scan returned zero records for 17:16:14-17:31:14 UTC
  (19:16:14-19:31:14 SAST), 26 October 2026. This is a bounded observation.
- Live evidence (outside OneDrive):
  - `live-commercial-proposal.jpg`
  - `live-saved-feedback-reference.jpg`
  - `live-notification-read-pending.jpg`
  - `runtime-errors-final.jsonl`, `tests.log`, `typecheck.log`
- Existing correction-registration and formal approval prerequisites remain;
  this release did not register a new reviewed content version, amend financial
  terms, approve agreements, publish courses or send invitations.
