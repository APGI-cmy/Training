# UX Workflow Addendum — Batch 3 Stabilisation

## Authority

CS2-authorised by Johan Ras on 2026-07-28 under AD-ALP-B3-STABILISATION-20260728.

## Corrected entry and navigation journeys

### UJ-B3-001 — Portal entry

- Unauthenticated `/` request routes to `/alp-sign-in`.
- Authenticated administrator routes to `/admin`.
- Authenticated non-administrator routes to `/dashboard`.
- The APGI Training brand follows the same role-aware destination.

### UJ-B3-002 — Administrator navigation

The administrator uses the persistent portal shell. Required destinations are Administration overview, Invitations, Access management, Course preview, Dashboard, Catalogue, Profile and Sign out. No parallel plain-text-only admin navigation is permitted.

### UJ-B3-003 — Learner dashboard

Dashboard shows only courses with active `enrolled` access. It must not count published-but-unenrolled courses in progress totals. Empty state directs the learner to Catalogue.

### UJ-B3-004 — My Learning

My Learning shows only `enrolled`, `pending` or `revoked` relationships, with status-aware actions and no false completion claim.

### UJ-B3-005 — Catalogue

Catalogue lists every published course and shows learner-specific status. Enrolled routes to the governed course shell; pending displays pending; not enrolled routes to the course overview/enrolment action; revoked displays recovery guidance.

### UJ-B3-006 — Shared course overview

VPSHR and Scannex use one visual and interaction pattern. Public or not-enrolled users see descriptive units without a misleading direct launch. Enrolled learners enter through `/learn/{courseSlug}`. Administrators may enter a clearly labelled role-gated preview path.

### UJ-B3-007 — Governed unit launch

All protected unit launches pass through the course shell and access decision. No public page may link directly to raw protected unit assets. The shell launches the resolved asset URL and provides return, progress and recoverable failure actions.

### UJ-B3-008 — Invitation delivery preflight

Invitation creation remains database-backed and token-protected. Until delivery is implemented, the administrator must receive an explicit `created_not_sent` outcome and a one-time copy action. Email delivery requires a separately approved provider preflight and must record `sent` or `failed`.

## Browser acceptance matrix

| Journey | Required proof |
|---|---|
| Portal entry | unauthenticated, admin and learner destinations |
| Admin shell | all admin and learner destinations visible and usable |
| Dashboard | enrolled-only cards and totals |
| My Learning | enrolled/pending/revoked only |
| Catalogue | all courses with correct status/action |
| VPSHR | enrolled learner reaches real unit content |
| Scannex | governed shell works; no public raw bypass |
| Admin preview | preview works without learner enrolment mutation |
| Invitation preflight | no email-send claim; explicit delivery posture |