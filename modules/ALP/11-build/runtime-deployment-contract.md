# APGI Learning Portal - WS-07 Runtime / Deployment Contract

## Status Header

| Field | Value |
|---|---|
| Artifact | Runtime / Deployment Contract |
| Module | ALP - APGI Learning Portal |
| Workstream | WS-07 - Runtime / Deployment Contract |
| Version | 0.1 |
| Status | Draft - filed for governance review |
| Repository | APGI-cmy/Training |
| Canonical Path | modules/ALP/11-build/runtime-deployment-contract.md |
| Prepared Date | 2026-06-16 |
| Prepared By | AI-assisted draft based on filed ALP Stage 2-6 artifacts and WS-06 QA range confirmation; requires Foreman/Governance/Technical review |
| Derived From | Stage 2 UX v0.3; Stage 3 FRS v0.2; Stage 4 TRS v0.3; Stage 5 Architecture v0.2; Requirement Registry v0.3; WS-06 QA-ALP Range Status Confirmation v0.2 |
| Deployment Target | Vercel preview and production deployment model, final project/environment binding pending authorized build setup |
| Build Authorized? | No |
| Builder Appointment Authorized? | No |
| Implementation Authorized? | No |

---

## 1. Purpose

This WS-07 Runtime / Deployment Contract records the runtime, deployment, environment, secret, storage, integration, health, and CWT assumptions for the APGI Learning Portal.

It resolves the runtime/deployment contract blocker carried forward by Stage 4 TRS, Stage 5 Architecture, Requirement Registry, and WS-06.

This artifact does not authorize builder appointment, build, or implementation.

---

## 2. Contract Scope

This contract defines the governance-approved deployment assumptions required before later build-readiness work may proceed:

- deployment target and environment posture;
- preview and production URL expectations;
- environment variable and secret naming contract;
- seeded role/user expectations;
- storage provider contract;
- payment provider configuration contract;
- AIMC Gateway runtime contract;
- certificate generation runtime contract;
- health/readiness checks;
- CWT evidence expectations;
- remaining blockers before build authorization.

This contract does not create, modify, deploy, seed, or activate any runtime.

---

## 3. Deployment Target Contract

| Contract Item | Decision |
|---|---|
| Primary hosting model | Vercel-compatible web application deployment model. |
| Preview environment | Pull-request preview deployments may be used for evidence once build is authorized. |
| Production environment | Production deployment may only be created or promoted after final build authorization. |
| Runtime status now | Contract-only; no build or production promotion authorized. |
| Repository source | APGI-cmy/Training. |
| Deployment protection | Protected deployments may be used; any share/access URL used for CWT must be recorded as evidence. |

---

## 4. Environment Variable and Secret Naming Contract

The final values remain secret-managed and must not be committed. The names below define the approved contract shape for later build setup.

| Name | Required For | Sensitivity | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_ALP_APP_NAME` | Public app label | Public | May expose non-secret display name. |
| `NEXT_PUBLIC_ALP_ENVIRONMENT` | Environment indicator | Public | Allowed values should distinguish local/preview/production. |
| `DATABASE_URL` | Application database connection | Secret | Must not be exposed to browser runtime. |
| `SUPABASE_URL` | Supabase project URL, if Supabase is used | Public/Restricted | Public client URL may be browser-visible if architecture permits. |
| `SUPABASE_ANON_KEY` | Supabase anon client key, if Supabase is used | Public/Restricted | Must be paired with server-side authorization/RLS posture. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase privileged operations | Secret | Server-only; never browser-exposed. |
| `PAYMENT_PROVIDER_SECRET_KEY` | Payment provider server operations | Secret | Server-only. |
| `PAYMENT_PROVIDER_WEBHOOK_SECRET` | Payment event verification | Secret | Required before paid enrolment activation. |
| `AIMC_GATEWAY_URL` | AIMC Gateway endpoint | Secret/Restricted | Server-side only unless explicitly approved. |
| `AIMC_GATEWAY_API_KEY` | AIMC Gateway authentication | Secret | Server-only. |
| `CERTIFICATE_SIGNING_SECRET` | Certificate generation/signing | Secret | Required if generated certificates are signed. |
| `ALP_PRIVATE_STORAGE_BUCKET` | Private learner/evidence/certificate storage | Restricted | Must not imply public read access. |
| `ALP_AUDIT_LOG_LEVEL` | Audit verbosity/configuration | Restricted | Must not leak secret data. |

Any implementation requiring additional variables must update this contract or be covered by a later approved runtime addendum.

---

## 5. Seeded Role and User Contract

No live users are created by this artifact.

Later authorized build setup must define safe seed fixtures for these roles:

| Role | Purpose | Seed Requirement |
|---|---|---|
| Learner | Learner journey CWT and RED-to-GREEN evidence | Test learner only; no real learner data. |
| Reviewer | Assessment review queue and final decision evidence | Test reviewer only. |
| Admin | Enrolment, reporting, certificate, and audit evidence | Test admin only. |
| Governance/Admin-equivalent | Governance/audit read evidence where needed | Test governance identity only. |

Seeded data must be non-production, non-personal, and clearly marked as test evidence unless explicitly authorized otherwise.

---

## 6. Storage Provider Contract

| Storage Area | Runtime Requirement |
|---|---|
| Learner profile media/document references | Private by default; owner/role-gated access required. |
| Assessment evidence | Private storage; learner/reviewer/admin access only through protected server operation. |
| Certificate artifacts | Private or controlled-access artifact storage; no public listing. |
| Audit records | Database or protected log store; admin/governance access only. |
| CWT evidence | May be stored in repo evidence folder or approved external evidence store after WS-10. |

Storage must not expose learner private material through public object URLs unless a separate governance-approved signed/expiring-access pattern is documented.

---

## 7. Payment Provider Runtime Contract

Payment provider integration remains contract-defined only until build authorization.

| Contract Item | Requirement |
|---|---|
| Payment initiation | Server-side operation creates pending enrolment/payment intent state. |
| Client redirect | Client redirect alone must not activate paid enrolment. |
| Event intake | Provider event must be received through controlled server boundary. |
| Event verification | Event authenticity must be verified using configured webhook secret. |
| Idempotency | Duplicate events must be safely ignored or reconciled without duplicate enrolment. |
| State handling | Pending, paid, failed, cancelled, duplicate, and reconciled states must be represented. |
| Audit | Material payment/enrolment transitions must be auditable. |

No payment provider key or webhook secret may be committed to the repository.

---

## 8. AIMC Gateway Runtime Contract

| Contract Item | Requirement |
|---|---|
| Gateway boundary | Assessment AI evaluation routes through AIMC Gateway abstraction. |
| Server-side use | Gateway URL/key must be server-side unless explicitly approved otherwise. |
| Failure handling | Timeout, malformed response, low confidence, gateway unavailable, or policy exception must enter recoverable or human-review-required state. |
| No silent decision | Gateway failure must not silently pass or fail learner. |
| Audit | Evaluation request/response summaries and fallback states must be auditable without leaking secrets. |

Direct provider calls outside the AIMC Gateway remain out of scope unless separately authorized.

---

## 9. Certificate Generation Runtime Contract

| Contract Item | Requirement |
|---|---|
| Eligibility gate | Certificate generation requires course completion, pass outcome, and required learner identity/profile fields. |
| Pre-eligibility behavior | Generation attempt before eligibility must be blocked and auditable. |
| Artifact handling | Generated certificate artifact must be learner-owned and admin/governance gated. |
| Signing/sealing | If certificates are signed, signing secret must remain server-only. |
| Failure handling | Generation failure must be recoverable or admin-reviewable. |

---

## 10. Health and Readiness Contract

Later implementation must expose or otherwise evidence health/readiness checks appropriate to the selected runtime.

| Check | Requirement |
|---|---|
| App shell readiness | Confirms application route shell responds. |
| Auth boundary readiness | Confirms protected route denial and allowed role path behavior. |
| Database readiness | Confirms required data access path is operational without exposing secrets. |
| Storage readiness | Confirms private storage access pattern is operational. |
| Payment event readiness | Confirms event intake verification path can be exercised in test/sandbox. |
| AIMC Gateway readiness | Confirms configured gateway can be reached or fails safely. |
| Certificate readiness | Confirms eligibility/generation path can be exercised in test fixture. |
| Audit readiness | Confirms material events are recorded and inspectable by authorized role. |

Health endpoints or evidence artifacts must not leak secrets, learner private material, payment secrets, gateway keys, or signing material.

---

## 11. Preview / Production CWT URL Posture

| Environment | CWT Posture |
|---|---|
| Local | Developer-only; not acceptable as final CWT evidence unless explicitly approved. |
| Preview | Acceptable for PR/build-wave CWT evidence once build is authorized. |
| Production | Acceptable only after final build authorization and promotion approval. |
| Protected Preview | Acceptable if share/access method is recorded in evidence and access expires or is controlled. |

WS-08 Golden Path Verification Pack must define the exact CWT routes, screenshots/evidence requirements, and pass/fail criteria before build evidence can close.

---

## 12. Runtime Contract Traceability

| Upstream Source | Runtime Contract Coverage |
|---|---|
| Stage 3 FRS | Learner/admin/reviewer/certificate/payment/assessment operational requirements. |
| Stage 4 TRS | Environment, integration, server operation, deployment, and evidence requirements. |
| Stage 5 Architecture | Runtime boundary, storage/privacy, payment, AIMC, certificate, CWT architecture. |
| Requirement Registry | Cross-stage traceability and QA range linkage. |
| WS-06 QA Range Status | Confirms `QA-ALP-001` through `QA-ALP-700` module-local evidence marker range. |

---

## 13. Remaining Governance Blockers

| Blocker ID | Blocker | Required Resolution |
|---|---|---|
| WS07-ALP-BLOCK-001 | Golden Path Verification Pack not filed | Complete WS-08 before build starts. |
| WS07-ALP-BLOCK-002 | Build tracker not initialized | Complete WS-09 before build starts. |
| WS07-ALP-BLOCK-003 | Evidence folder convention not confirmed | Complete WS-10 before build starts. |
| WS07-ALP-BLOCK-004 | Stage 9 builder checklist PASS evidence for named builders not complete | Complete before builder appointment. |
| WS07-ALP-BLOCK-005 | Stage 10 IAA acknowledgements for named builders not complete | Complete before builder appointment. |
| WS07-ALP-BLOCK-006 | Assurance/advisory recording not complete | Complete before builder appointment. |
| WS07-ALP-BLOCK-007 | Stage 11 actual builder appointment not complete | Complete before Stage 12 build authorization. |
| WS07-ALP-BLOCK-008 | Final Stage 12 build authorization not issued | Complete only after all prior blockers clear. |

---

## 14. Gate Checklist

| Gate Item | Result | Reason |
|---|---|---|
| Runtime/deployment target posture defined | PASS | Section 3. |
| Environment/secret names defined | PASS | Section 4. |
| Seeded role/user contract defined | PASS | Section 5. |
| Storage provider contract defined | PASS | Section 6. |
| Payment provider contract defined | PASS | Section 7. |
| AIMC Gateway contract defined | PASS | Section 8. |
| Certificate generation contract defined | PASS | Section 9. |
| Health/readiness checks defined | PASS | Section 10. |
| Preview/production CWT posture defined | PASS | Section 11. |
| Remaining blockers preserved | PASS | Section 13. |
| Human Governance/Technical approval | PENDING | Required before approval state. |
| Build authorized | NO | Pre-build remediation still incomplete. |

---

## 15. WS-07 Decision

```text
WS-07 Runtime / Deployment Contract: FILED FOR REVIEW.
Runtime and deployment contract assumptions: DEFINED FOR REVIEW.
WS-08 Golden Path Verification Pack: NEXT.
Builder Appointment: BLOCKED.
Build Authorization: BLOCKED.
Implementation: BLOCKED.
```

---

## 16. Drafting Note (AI-assisted)

This Runtime / Deployment Contract was drafted with AI assistance at user request and is filed for review.
It does not constitute final Foreman, Product Owner, Technical, Architecture, QA, or Governance approval.

---

## 17. Change History

| Version | Date | Change Description | Changed By | Approval |
|---|---|---|---|---|
| 0.1 | 2026-06-16 | Filed WS-07 Runtime / Deployment Contract for ALP. | AI-assisted draft (pending Foreman/Governance/Technical review) | Filed for review; build remains blocked |
