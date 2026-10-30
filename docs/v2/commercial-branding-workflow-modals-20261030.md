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
while preparing or verifying this UI update.

## Verified live release

Source `4fb12ff01cdb182fc7c740ac5b3038f6ecdd33cf` is deployed as
`dpl_EssbF5NSuE3qq2uHzvGSP4P1ChF1`. The hosted build is Ready and the canonical
V2 alias points to that exact deployment. Public deployment metadata returns 200
and all four course fingerprints match the preceding release; the unauthenticated
deployment job remains protected with 401.

Authenticated Johan browser checks confirmed:

- VPSHR main sidebar summaries show commercial 2/5 and branding 1/2, with no
  duplicated expanded commercial/branding substep lists.
- Commercial tasks open in the modal; Jorrie's sign-off button navigates directly
  to his saved status. The full proposal, previous versions and saved comments
  remain accessible. A direct NKS commercial sign-off URL also opens the modal,
  with seven tasks across its assigned reviewers.
- The main branding label opens the separate branding modal. The exact Jorrie
  reviewer destination shows his outstanding review alongside Johan's saved
  approval; logo/certificate previews remain available.
- Close workflow and Escape both dismiss a modal and return to its summary.

Before/after database comparisons match the workflow, task-decision, finding and
participant hashes and revisions for both VPSHR and NKS. The 14 existing changed
Executive Assistant course files also retained their exact working-file hashes
when the UI commit was integrated into the main worktree.

Evidence in the external QA directory includes `live-commercial-workflow.png`,
`live-branding-workflow.png`, `record-preservation.json`,
`other-course-edits-preserved.json`, `release-tests.log`, `typecheck.log`,
`candidate-status.json`, `live-status.json`, `alias.json` and `build.log`.
