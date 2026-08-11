# W4.2 Learner Management Experience — Local Build Candidate Evidence

| Field | Evidence |
|---|---|
| Branch | `agent/w4-2-learner-management-fullpage-preview` |
| Product commit | `b686607` |
| Correct RED | `npm run test:alp:lm` at the QA commit produced 6/6 intended missing-capability failures: directory service/page, invitation draft, import workspace, full-page preview and navigation link. |
| Scoped QA GREEN | `npm run test:alp:lm`: 6/6 PASS. |
| Regression | `npm run test:alp:w4-2`: 36/36 PASS. |
| Typecheck | `npm run typecheck`: PASS. |
| Bundle compile | `./node_modules/.bin/next build`: PASS; includes `/admin/learners` and `/admin/courses/[courseSlug]/preview/[unitSlug]/full`. |
| Read/write posture | UI invokes no invitation, enrolment, progress, provider or import-execution action. |
| Browser proof | Pending. The local environment could compile but its dev server reported a sandbox network-interface error and did not have the required browser utility. An authenticated Vercel Preview smoke test is mandatory. |

## Required Preview Smoke

1. Sign in as administrator and open Learners; validate search, table layout and a selected learner context.
2. Open Invitations; review an invitation draft and locally stage the CSV template without creating/sending anything.
3. Open Manage enrolments from a learner row; confirm the review-only boundary.
4. Open VPSHR full-page preview; confirm it renders in the larger administrator-only workspace and writes no learner progress.

No production deployment or merge is authorised by this evidence.
