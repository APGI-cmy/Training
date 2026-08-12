# App-wide QA Coverage Manifest — APGI Learning Portal

This is the canonical coverage map for the App Management Centre (AMC). Each row must carry a test reference, latest state, evidence link and monitoring signal before that capability can claim release acceptance.

| Domain | Required end-to-end test | Current state | Evidence | AMC health signal |
|---|---|---|---|---|
| Auth and role separation | Login, logout, session expiry, admin/learner denial | Partial | TBD | auth failure/error rate |
| Profile and private files | Onboarding, profile edit, protected CV/photo upload | Not built | TBD | RLS/storage denials |
| Catalogue and course shell | Catalogue → enrolled course → unit navigation | Delivered scope | TBD | route/render errors |
| Media and progress | VPSHR/Scannex playback and idempotent progress | Delivered scope | TBD | playback/progress failures |
| Invitation and enrolment | Create → send → accept → onboarding → enrolment → access | RED | TBD | lifecycle/audit failure |
| Bulk intake | Validate → duplicate disposition → governed execution | Draft-only | TBD | validation/import failure |
| Payments | Checkout → webhook → enrolment/refund | Not built | TBD | webhook/payment failures |
| Assessment and AI | Submit → evaluate → human oversight → appeal | Not built; AI deferred | TBD | evaluation queue/quality |
| Certificates | Eligibility → generation → verification/revocation | Not built | TBD | generation/verification failure |
| Admin, reporting and audit | Authorised management/report/export/audit | Partial | TBD | admin/RLS/audit gaps |
| Database security | Migration/table pathway/RLS audit | Per-wave | TBD | policy/advisor failures |
| Deployment/CWT | CI → preview → smoke → production/runbook | Partial | TBD | deployment/runtime failures |

Status is intentionally granular: delivered UI, persistent implementation, automated GREEN and production acceptance are separate facts.