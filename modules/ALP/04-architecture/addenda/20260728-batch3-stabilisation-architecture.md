# Architecture Addendum — Batch 3 Stabilisation

## Decision summary

Lane A uses existing Next.js server components, Supabase-backed access decisions and the established portal shell. No new database schema is required.

## Component decisions

1. **Entry resolver** — one server-side helper maps anonymous, administrator and learner sessions to `/alp-sign-in`, `/admin` or `/dashboard`.
2. **Navigation model** — one role-aware navigation definition feeds learner and administrator shells. Administrator pages no longer maintain a separate plain-text navigation island.
3. **Dashboard projection** — dashboard cards derive from published courses plus live access decisions, filtered to `enrolled` before progress totals are calculated.
4. **Relationship projection** — My Learning derives from the same access decisions but retains enrolled, pending and revoked.
5. **Shared course overview** — VPSHR and Scannex render through one course overview component with generic status-aware actions.
6. **Governed launch boundary** — public overviews describe units but do not link to protected raw assets. Learner launch uses `/learn/{courseSlug}` and `/learn/{courseSlug}/units/{unitSlug}`.
7. **Admin preview boundary** — `/admin/courses/{courseSlug}/preview` requires the admin role and renders the course shell in explicit preview mode without writing enrolment or progress.
8. **Asset resolution** — both course families use the single-encoding asset helper.
9. **Invitation delivery boundary** — Lane A does not send mail. A later delivery adapter must sit behind a server-only interface and write sent/failed audit events.

## Security decisions

- No client can bypass access by following a raw public asset link.
- Admin preview is authorization-gated, not enrolment-gated.
- Preview mode must not call completion mutations.
- Delivery secrets remain in Vercel server environments.
- Existing Supabase RLS and service-role write boundaries remain unchanged.

## Deployment

Lane A deploys through the existing `training-platform` and `training-urls-module` Vercel projects. Exact-head commit identity must be verified on both relevant deployments before browser retest.