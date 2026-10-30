# Commercial and branding approval workflow modals — 30 October 2026

Commercial and branding substeps now live inside separate workflow modals, using
the existing saved publication guide as their progress source. The main course
sidebar keeps one summary label for each stage, with a completed/required task
count and a direct workflow link. Other publication stages retain their navigation.

## Behaviour

- Commercial preparation, saved pricing, both independent APGI signatures,
  assigned reviewer decisions, proposal discussion, and offer controls remain
  in the commercial workflow. Substep buttons navigate directly to the relevant
  record or form; private principal content retains its existing server-side guards.
- Branding/design has its own modal with logo, colour, footer and certificate
  previews, company-owner sign-off, and each assigned reviewer's saved decision.
  Each reviewer has a unique destination. A saved comment remains in its editor.
- Both modals use the same guide objects as the main summary. Any number of
  assigned reviewers is rendered dynamically, rather than a fixed two-person UI.
  Exact current branding revision and bound reviewer identity determine completion.
- Existing commercial and branding notification anchors open the relevant modal
  automatically, including deep links into earlier saved comments. Commercial-page
  links open that workflow immediately. Closing returns to the summary; Escape
  is supported by the native modal. Headers retain a visible close control.
- Forms stay mounted while navigating or closing a modal. Existing save actions,
  exact-version checks, role permissions, approval/publication gates and history
  are reused. Saving refreshes the guide through the existing server refresh;
  focus and same-review updates in another tab also refresh the commercial screen.

## Validation and isolation

985 release tests passed, one optional test skipped; TypeScript passed. Added
coverage includes five-reviewer counts, summary-only main navigation, saved
branding feedback, current revision changes, offered versus private commercial
visibility, and existing notification references. Updated two older tests for the
new navigation and client modal boundary. No database migration is needed.

Work was isolated under `C:/Users/Johan/Codex-Work/commercial-branding-modals-20261030/`
because Executive Assistant course edits were in progress in the main worktree.
The pilot course used its committed baseline for checks. Dependency/course test
links were created only in this external build directory, outside OneDrive. No
OneDrive source project, dependency link or symlink was changed by this task.

No agreement was approved, review reset, task decision submitted or message sent
while preparing this UI update. Hosted and authenticated browser verification will
be recorded after release.
