# App-wide QA Coverage Manifest — APGI Learning Portal

This is the canonical coverage map for the App Management Centre (AMC). Each row must carry a test reference, latest state, evidence link and monitoring signal before that capability can claim release acceptance.

| Domain | Required end-to-end test | Current state | AMC health signal |
|---|---|---|---|
| Auth and role separation | Login, logout, session expiry, admin/learner denial | Partial | auth failure/error rate |
| Profile and private files | Onboarding, profile edit, protected CV/photo upload | Not built | RLS/storage denials |
| Catalogue and course shell | Catalogue → enrolled course → unit navigation | Delivered scope | route/render errors |
| Media and progress | VPSHR/Scannex playback and idempotent progress | Delivered scope | playback/progress failures |
| Invitation and enrolment | Create → send → accept → onboarding → enrolment → access | RED | lifecycle/audit failure |
| Bulk intake | Validate → duplicate disposition → governed execution | Draft-only | validation/import failure |
| Payments | Checkout → webhook → enrolment/refund | Not built | webhook/payment failures |
| Assessment and AI | Submit → evaluate → human oversight → appeal | Not built; AI deferred | evaluation queue/quality |
| Certificates | Eligibility → generation → verification/revocation | Not built | generation/verification failure |
| Admin, reporting and audit | Authorised management/report/export/audit | Partial | admin/RLS/audit gaps |
| Database security | Migration/table pathway/RLS audit | Per-wave | policy/advisor failures |
| Deployment/CWT | CI → preview → smoke → production/runbook | Partial | deployment/runtime failures |

Status is intentionally granular: delivered UI, persistent implementation, automated GREEN and production acceptance are separate facts.