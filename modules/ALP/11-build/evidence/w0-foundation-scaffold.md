# W0 Foundation / Scaffold Evidence

## Status Header

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W0 - Foundation / Scaffold |
| Evidence Version | 0.1 |
| Status | Filed for review |
| Prepared Date | 2026-06-23 |
| Builder | BC-ALP-CONSOLIDATED-001 |
| PR Scope | Foundation scaffold only |
| CODE_PASS Claimed? | No |
| FUNCTIONAL_PASS Claimed? | No |
| CWT_PASS Claimed? | No |

---

## 1. Purpose

This evidence file records the W0 scaffold changes for the first authorized ALP build wave.

W0 establishes environment, route-state, helper, migration-path, and evidence-path scaffolding. It does not implement business workflows, learner authentication, enrolment, payments, assessment, AI review, certificates, reports, deployment acceptance, or CWT closure.

---

## 2. W0 Scope Evidence

| W0 Item | Evidence Path | Status |
|---|---|---|
| Environment example | `.env.example` | Added |
| Environment validation | `src/lib/config/env.ts` | Added |
| Supabase browser helper skeleton | `src/lib/supabase/client.ts` | Added |
| Supabase server helper skeleton | `src/lib/supabase/server.ts` | Added |
| Supabase helper types | `src/lib/supabase/types.ts` | Added |
| Shared app shell component | `src/components/layout/app-shell.tsx` | Added |
| Empty state component | `src/components/ui/empty-state.tsx` | Added |
| Error state component | `src/components/ui/error-state.tsx` | Added |
| Route error state | `app/error.tsx` | Added |
| Route loading state | `app/loading.tsx` | Updated |
| Route not-found state | `app/not-found.tsx` | Updated |
| Route unauthorized state | `app/unauthorized.tsx` | Added |
| Server scaffold directory | `src/server/README.md` | Added |
| Supabase migration path | `supabase/migrations/001_alp_auth_profile.sql` | Added as placeholder |
| Supabase RLS path | `supabase/migrations/007_alp_rls_policies.sql` | Added as placeholder |
| Edge function registry | `docs/edge-functions/APGI_LEARNING_PORTAL_EDGE_FUNCTION_REGISTRY.md` | Added |
| Tracker update | `modules/ALP/BUILD_PROGRESS_TRACKER.md` | Updated in this PR |

---

## 3. Known Connector Limitations During W0 Filing

The connector safety layer blocked two intended writes:

- root layout replacement to consume the shared `AppShell` directly;
- a large stylesheet replacement to add dedicated `.state-card` styling.

The W0 PR therefore keeps the existing working root layout intact and files the shared shell/state components for downstream use. Route-level states still render through existing `content-band`, `content-inner`, `button-row`, `primary-button`, and typography classes.

---

## 4. Verification Status

| Check | Status | Notes |
|---|---|---|
| Local build | Not run by connector | Await PR/Vercel checks. |
| Local typecheck | Not run by connector | Await PR/Vercel checks. |
| Local RED suite | Not run by connector | Await PR/Vercel checks. |
| Vercel / GitHub checks | Pending | To be reviewed after PR creation. |

---

## 5. Explicit Non-Claims

```text
CODE_PASS: NOT CLAIMED.
FUNCTIONAL_PASS: NOT CLAIMED.
CWT_PASS: NOT CLAIMED.
Deployment acceptance: NOT CLAIMED.
Production readiness: NOT CLAIMED.
```

---

## 6. Handover Boundary

If PR checks pass and this W0 PR is merged, the next wave is W1 Auth + Profile + Files.

W1 must replace placeholders with real auth/profile/schema implementation and file fresh evidence before any W1 closure claim.
