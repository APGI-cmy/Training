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
- Live deployment and browser verification pending.
