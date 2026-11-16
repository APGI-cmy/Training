# W0 Foundation / Scaffold Evidence

## Status Header

| Field | Value |
|---|---|
| Module | ALP - APGI Learning Portal |
| Wave | W0 - Foundation / Scaffold |
| Evidence Version | 0.3 |
| Status | Filed for review |
| Prepared Date | 2026-06-23 |
| Updated Date | 2026-06-24 |
| Builder | BC-ALP-CONSOLIDATED-001 |
| PR Scope | Foundation scaffold only |
| Implementation PR | #71 - Implement ALP W0 foundation scaffold |
| Merge Commit | `48ce32a1974b14487864713af1287ab0379cf4d8` |
| W1 Entry Authorized? | Yes, for W1 Auth + Profile + Files only |
| Full App Delivery Claimed? | No |
| CODE_PASS Claimed? | No |
| FUNCTIONAL_PASS Claimed? | No |
| CWT_PASS Claimed? | No |

---

## 1. Purpose

This evidence file records the W0 scaffold changes for the first authorized ALP build wave and records W0 closure after PR #71 was merged.

W0 establishes environment, route-state, helper, migration-path, and evidence-path scaffolding. It does not implement business workflows, learner authentication, enrolment, payments, assessment, AI review, certificates, reports, deployment acceptance, or CWT closure.

---

## 2. W0 Scope Evidence

| W0 Item | Evidence Path | Status |
|---|---|---|
| Environment example | `.env.example` | Added / updated with private file bucket placeholder |
| Environment validation | `src/lib/config/env.ts` | Added / patched for direct public env references |
| Supabase browser helper skeleton | `src/lib/supabase/client.ts` | Added |
| Supabase server helper skeleton | `src/lib/supabase/server.ts` | Added / patched to check Supabase server readiness only |
| Supabase helper types | `src/lib/supabase/types.ts` | Added |
| Shared app shell component | `src/components/layout/app-shell.tsx` | Added |
| Empty state component | `src/components/ui/empty-state.tsx` | Added |
| Error state component | `src/components/ui/error-state.tsx` | Added |
| Route error state | `app/error.tsx` | Added |
| Route loading state | `app/loading.tsx` | Updated |
| Route not-found state | `app/not-found.tsx` | Updated |
| Route unauthorized state | `app/unauthorized.tsx` | Added / spelling aligned to authorized |
| Server scaffold directory | `src/server/README.md` | Added |
| Supabase migration path | `supabase/migrations/001_alp_auth_profile.sql` | Added as placeholder; schema not implemented |
| Supabase RLS path | `supabase/migrations/007_alp_rls_policies.sql` | Added as placeholder; RLS not implemented |
| Edge function registry | `docs/edge-functions/APGI_LEARNING_PORTAL_EDGE_FUNCTION_REGISTRY.md` | Added |
| Tracker update | `modules/ALP/BUILD_PROGRESS_TRACKER.md` | Updated in PR #71 and updated again for W0 closure / W1 entry |

---

## 3. Independent Review Findings Addressed

| Finding | Resolution in PR #71 |
|---|---|
| Client env validation used dynamic `process.env` lookup for public keys | Patched `src/lib/config/env.ts` to build default client source from direct `process.env.NEXT_PUBLIC_*` references. |
| Server placeholder derived service-role readiness from all future env vars | Patched `src/lib/supabase/server.ts` to use Supabase-only server env validation. |
| `.env.example` missed `PRIVATE_FILE_BUCKET` | Added `PRIVATE_FILE_BUCKET`. |
| Migration placeholders overstated Stage 6 coverage | Updated comments to state they reserve paths only and do not satisfy schema/RLS content tests. |
| Unauthorized copy used `authorised` spelling | Updated to `authorized`. |
| No full app workflows implemented | Explicitly recorded as out of W0 scope and not delivered by PR #71. |
| No functional/CWT evidence exists | Explicitly recorded as not claimed and still pending later wave/deployment evidence. |

---

## 4. Review / Merge Closure

| Closure Item | Status | Evidence |
|---|---|---|
| PR #71 merged | Closed / merged | Merge commit `48ce32a1974b14487864713af1287ab0379cf4d8` |
| Review conversations | Resolved before merge | All W0 review threads resolved before closure |
| Vercel / GitHub checks | Accepted before merge | Latest W0 head SHA `a140d5a8c5a5f19f5e8cee8e99c748d50b1fbd4d` had Vercel success before merge |
| W0 evidence | Closed for W0 scaffold scope | This file and `20260624-W0-GOV-ALP-072-decision-w0-closure-w1-entry.md` |
| W1 entry | Authorized | Limited to Auth + Profile + Files scope from Stage 8 implementation plan |

---

## 5. Known Connector Limitations During W0 Filing

The connector safety layer blocked two intended writes:

- root layout replacement to consume the shared `AppShell` directly;
- a large stylesheet replacement to add dedicated `.state-card` styling.

The W0 PR therefore keeps the existing working root layout intact and files the shared shell/state components for downstream use. Route-level states still render through existing `content-band`, `content-inner`, `button-row`, `primary-button`, and typography classes.

---

## 6. Verification Status

| Check | Status | Notes |
|---|---|---|
| Local build | Not run by connector | No local execution claim made. |
| Local typecheck | Not run by connector | No local execution claim made. |
| Local RED suite | Not run by connector | No local execution claim made. |
| Vercel / GitHub checks | Accepted for W0 PR merge | PR #71 was merged after review/check acceptance. |
| Full workflow validation | Not run / not claimed | Reserved for W1-W9 and W9 CWT evidence. |

---

## 7. Explicit Non-Claims

```text
FULL APP DELIVERY: NOT CLAIMED.
CODE_PASS: NOT CLAIMED.
FUNCTIONAL_PASS: NOT CLAIMED.
CWT_PASS: NOT CLAIMED.
Deployment acceptance: NOT CLAIMED.
Production readiness: NOT CLAIMED.
```

---

## 8. Handover Boundary

W0 is closed only as the Foundation / Scaffold wave.

W1 Auth + Profile + Files is now authorized for entry and must replace placeholders with real auth/profile/schema implementation and file fresh W1 evidence before any W1 closure claim.

Full functional delivery of the envisaged ALP app remains pending W1-W9 implementation and evidence.
