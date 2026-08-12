# App-wide QA Coverage Manifest — APGI Learning Portal

This is the canonical coverage map for the App Management Centre (AMC). Every capability must map to an executable test reference, accountable owner, latest status, acceptance evidence and monitoring signal before release acceptance. “TBD” is an explicit open obligation, never acceptance evidence.

| Domain | Required end-to-end test | Test reference | Owner | Current state | Evidence | Monitoring signal |
|---|---|---|---|---|---|---|
| Auth and role separation | Login, logout, session expiry, admin/learner denial | W1 auth regression suite | Auth/QA | Partial | Existing W1 evidence; expiry test TBD | auth failure/error rate |
| Profile and private files | Onboarding, profile edit, protected CV/photo upload | QA-IL-006..008 | Data/QA | RED | RED baseline required | RLS/storage denials |
| Catalogue and course shell | Catalogue → enrolled course → unit navigation | Batch 3 + W2 regression | Product/QA | Delivered scope | PR #102 production smoke | route/render errors |
| Media and progress | VPSHR/Scannex playback and idempotent progress | W3 regression | Product/QA | Delivered scope | PR #102 production smoke | playback/progress failures |
| Invitation and enrolment | Create → send → accept → onboarding → enrolment → access | QA-IL-001..009 | Data/QA | RED | RED baseline required | lifecycle/audit failure |
| Bulk intake | Validate → duplicate disposition → governed execution | QA-IL-010 | Data/QA | Draft-only | PR #104 no-write smoke | validation/import failure |
| Payments | Checkout → webhook → enrolment/refund | W4.3–W4.5 QA TBD | Payments/QA | Not built | TBD | webhook/payment failures |
| Assessment and AI | Submit → evaluate → human oversight → appeal | W5–W6 QA TBD | Learning/QA | Not built; AI deferred | TBD | evaluation queue/quality |
| Certificates | Eligibility → generation → verification/revocation | W7 QA TBD | Certificates/QA | Not built | TBD | generation/verification failure |
| Admin, reporting and audit | Authorised management/report/export/audit | W4 admin + QA-IL-009 | Admin/QA | Partial | PR #104 / lifecycle RED | admin/RLS/audit gaps |
| Database security | Migration/table pathway/RLS audit | per-wave schema/RLS tests | Data/QA | Per-wave | Required before DB closure | policy/advisor failures |
| Deployment/CWT | CI → preview → smoke → production/runbook | deployment/CWT suite TBD | Release/QA | Partial | PR #102 production smoke | deployment/runtime failures |

Status is intentionally granular: delivered UI, persistent implementation, automated GREEN and production acceptance are separate facts.