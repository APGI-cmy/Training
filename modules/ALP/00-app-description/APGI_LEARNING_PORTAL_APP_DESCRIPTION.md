# APGI Learning Portal - App Description

## Status Header

| Field | Value |
|---|---|
| Version | 0.1 |
| Status | Draft |
| Owner | Johan Ras / APGI Product Owner |
| Approval Date | Pending CS2 approval |
| Last Updated | 2026-06-03 |
| Authority | Johan Ras |
| Canonical Location | docs/governance/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md |
| Policy Authority | governance/policy/APP_DESCRIPTION_REQUIREMENT_POLICY.md v2.0 |
| Repository | APGI-cmy/Training |
| Protected External Content Source | The URL branch and training-urls-module Vercel deployment remain untouched and are treated as Version 1 read-only learning content sources. |

---

## §1 - Application Identity

- **Application Name**: APGI Learning Portal
- **Purpose**: The APGI Learning Portal is a governed e-learning and learner-management platform that allows learners to enrol, maintain a professional learner profile, access enrolled courses, track progress, complete assessments, and obtain certificates.
- **Target Users/Audience**: APGI learners, APGI administrators, APGI assessors/reviewers, APGI course publishers, and future external tenant administrators.
- **Core Value Proposition**: APGI can move from a Thinkific-dependent delivery model toward its own extensible LMS/LXP platform while preserving the existing published learning-module URL stream for Version 1.

---

## §2 - Scope Definition

### In Scope - Version 1

- Learner registration by invitation link and paid self-enrolment.
- Learner authentication and protected learner dashboard.
- Learner profile capture for certificate identity and future professional-profile/CV use.
- Learner photograph and CV/profile document upload.
- Course cards showing enrolled courses and overall learner progress.
- Course view with left sidebar navigation showing course modules, learning units, completion state, and current location.
- Embedded or linked display of learning units published on the protected training URL module deployment.
- Full-screen or expanded learning-unit viewing mode.
- Bottom navigation to move to the next learning unit/module, while preserving internal iSpring navigation inside embedded content.
- Tracking of learner access, learning-unit completion, module completion, course completion, and assessment status.
- Embedded iSpring quizzes/interactions are treated as formative teaching activities, not final pass/fail assessments.
- Summative/formal assessment records after modules or courses, including score, pass/fail result, attempt count, and reassessment eligibility.
- AI-supported evaluation for uploaded written, practical, or video evidence, routed through the approved AI gateway.
- Certificate generation/printing after successful completion.
- Basic admin course, learner, enrolment, assessment, certificate, and reporting management.
- E-commerce checkout for paid enrolment.
- Governance evidence, test-first delivery, deployment runbooks, and audit logs required by canon.

### Explicitly Out of Scope - Version 1

- Editing or disrupting the URL branch currently feeding Thinkific.
- Rebuilding the existing iSpring learning units inside the LMS.
- Full SCORM/xAPI/LRS implementation unless later approved during TRS/Architecture.
- Multi-tenant white-labelling for external companies.
- Learner-created pathway builder, discount engine, downpayment plans, or pay-in-advance plans.
- Advanced social learning, forums, messaging, gamification, badges, CPD marketplace, or employer recruitment features.
- Public CV publishing or automated employment placement.
- Fully automated high-stakes AI assessment without human review/override controls.

### Boundaries and Constraints

- The URL branch and training-urls-module deployment are read-only learning-content sources for Version 1.
- The main branch is the APGI Learning Portal platform branch.
- iSpring remains the Version 1 content authoring/publishing source.
- Learner certificate identity fields must be captured before certificate generation.
- Learner personal data, CVs, photos, assessment submissions, and certificates are protected data requiring auth, authorization, audit logging, and retention policy.
- Payment access and invitation access are both enrolment sources but must be auditable separately.
- AI evaluation is assistive and governed; assessment rules must be explicit and traceable.

---

## §3 - Success Criteria

- A learner can enrol by invitation or payment, log in, complete profile fields, and see a personalized dashboard.
- A learner can open an enrolled course card and navigate a structured course page with module/unit sidebar progress.
- A learner can launch Version 1 learning units from the published URL source without modifying the URL branch.
- The system records learning-unit, module, course, and assessment status per learner.
- The system distinguishes embedded formative iSpring interactions from external summative pass/fail assessments.
- The system supports certificate generation only after required completion and assessment rules are satisfied.
- Admins can manage learners, enrolments, course metadata, assessments, certificates, and reports.
- AI assessment evaluation is routed only through the approved gateway and records score/verdict/rationale/attempt metadata.
- Paid enrolment and invited enrolment are both supported with auditable records.
- Governance artifacts exist and are traceable from App Description through build authorization.
- **Definition of Done for the Application**: Version 1 is done only when the deployable portal is live, protected by real auth, connected to the learner database, browser-verified across learner/admin/payment/course/certificate paths, QA green, PREHANDOVER-proved, and accepted by Johan Ras or delegated authority.

---

## §4 - Strategic Context

- **Why this application exists**: APGI requires its own LMS/LXP to control learning delivery, learner records, assessment, certification, professional learner profiles, and future platform commercialization.
- **Business or operational driver**: Thinkific currently provides delivery convenience, but APGI needs ownership of learner journey, data model, assessment logic, certificate issuance, and future multi-tenant expansion.
- **Relationship to other systems**: training-urls-module URL branch, Thinkific, iSpring, payment gateway, AIMC Gateway, email service, Vercel, GitHub.
- **Replacement/extension of**: Extends APGI Training into a full learning portal while preserving existing static course URL delivery.

---

## §5 - Build Lifecycle Stages (§AD-01)

Stages must execute in this exact order. Skipping or reordering is prohibited without documented CS2 approval.

1. App Description
2. UX Workflow & Wiring Spec
3. Functional Requirements Specification (FRS)
4. Technical Requirements Specification (TRS)
5. Architecture
6. QA-to-Red
7. PBFAG
8. Implementation Plan
9. Builder Checklist
10. IAA Pre-Brief
11. Builder Appointment
12. Build

No build work may start from this App Description alone.

---

## §6 - Requirements Derivation Chain (§AD-02)

```text
App Description: docs/governance/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md v0.1
    -> UX Workflow & Wiring Spec: docs/governance/APGI_LEARNING_PORTAL_UX_WORKFLOW_WIRING_SPEC.md v0.1
    -> FRS: docs/governance/APGI_LEARNING_PORTAL_FRS.md v0.1
    -> TRS: docs/governance/APGI_LEARNING_PORTAL_TRS.md v0.1
    -> Architecture: architecture/APGI_LEARNING_PORTAL_ARCHITECTURE.md v0.1
    -> Build Authorization: architecture/builds/{BUILD_ID}/BUILD_AUTHORIZATION_CERTIFICATE.md
```

Each downstream artifact must include an explicit Derived from statement naming the upstream artifact and version.

---

## §7 - Technology Stack (§AD-03)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js + React | Existing main branch direction continues. |
| Language | TypeScript | Required for type-safe LMS workflows. |
| UI | Responsive accessible design system; final library in TRS | Sidebar shell, forms, full-screen viewer. |
| State | React Context/session state plus server state; optional Zustand for UI state | See §24. |
| Database | Supabase PostgreSQL or equivalent managed PostgreSQL | Learners, enrolments, progress, assessments, certificates, payments, audit logs. |
| Auth | Supabase Auth or equivalent JWT auth | Invite, paid enrolment, learner/admin roles. |
| File Storage | Supabase Storage or equivalent | CVs, photographs, assessment uploads, certificate PDFs. |
| AI | AIMC Gateway | Direct AI provider calls prohibited. |
| Serverless | Supabase Edge Functions or approved Next.js server endpoints | Registry required. |
| Payments | Stripe baseline; PayFast/Paystack or equivalent may be added by TRS | Paid enrolment, webhooks, refunds/manual reconciliation. |
| Email | Transactional email provider chosen in TRS | Invitations and notifications. |
| Deployment | Vercel | Platform deployment separate from URL module content source. |
| CI/CD | GitHub Actions + Vercel checks | Tests, typecheck, lint, build, governance checks. |
| Notifications | Sonner or equivalent toast system | alert() prohibited. |
| Content Source | Published Vercel links from training-urls-module | Read-only Version 1 content source. |
| Standards Awareness | SCORM/xAPI/LRS considered in Architecture | Version 1 may use simpler portal-level tracking if approved. |

---

## §8 - Deliverable Artifacts (§AD-04)

All items below are non-negotiable deliverables. **Is the deployable app a non-negotiable deliverable? YES.**

- [ ] Deployable APGI Learning Portal production build.
- [ ] App Description.
- [ ] UX Workflow & Wiring Spec.
- [ ] FRS.
- [ ] TRS.
- [ ] Architecture.
- [ ] QA-to-Red test suites per wave.
- [ ] PBFAG artifacts per wave.
- [ ] Implementation Plan.
- [ ] Builder Checklist.
- [ ] IAA Pre-Brief.
- [ ] PREHANDOVER proofs per wave.
- [ ] Physical verification evidence for UI waves.
- [ ] Database migrations and seed scripts.
- [ ] Schema-to-hook validation artifacts.
- [ ] Table Pathway Audit artifacts.
- [ ] RLS Audit Gate artifact.
- [ ] Auth Wiring Checklist artifacts.
- [ ] Edge Function Registry.
- [ ] AI Gateway integration proof.
- [ ] Payment integration proof.
- [ ] Certificate generation proof.
- [ ] Deployment runbooks.
- [ ] CWT Closure Report.
- [ ] BUILD_PROGRESS_TRACKER.md updated per wave.
- [ ] .env.example complete and verified.

---

## §9 - Component Definition of Done (§AD-05)

A component is only done when implemented, integrated, QA green, browser-verified, and PREHANDOVER-proved.

| Component | Done Criteria |
|---|---|
| Authentication and enrolment | Real auth, invite and payment paths tested, browser-verified. |
| Learner profile | Certificate fields, optional profile fields, photo/CV upload, validation, storage, RLS. |
| Learner dashboard | Course cards, enrolled courses, progress summaries, next action. |
| Course shell | Sidebar modules/units, active unit viewer, completion indicators, next navigation, full-screen mode. |
| Learning unit integration | Loads URL module content without modifying URL branch, handles unavailable content, tracks portal-level viewing/completion. |
| Progress tracking | Persists unit/module/course progress per learner across sessions/devices. |
| Summative assessment | Assessment assignment, attempt rules, uploads, AI request, score/verdict storage, reassessment rules, human review path. |
| AI evaluation | AIMC Gateway only, rationale/audit metadata, no direct provider calls, failure states handled. |
| Payment checkout | Verified payment creates enrolment, failed/cancelled payments handled, webhook authenticated, audit logged. |
| Certificate generation | Eligibility rules enforced, certificate printable/downloadable, certificate record/audit exists. |
| Admin console | Learner/course/enrolment/assessment/certificate/report management with authorization. |
| Audit logging | Auth, profile, payment, enrolment, progress, assessment, AI, certificate, and admin actions logged. |
| Deployment | Production configured, smoke-tested, runbook filed, CWT closed. |

---

## §10 - Test-First Guarantee (§AD-06)

Code-first development is prohibited. Every build wave and remediation wave must be preceded by QA-to-Red tests.

- **QA Agent/Role**: QA Agent appointed by Foreman.
- **Expected QA-to-Red state**: Tests exist, are derived from approved artifacts, and fail for the expected missing implementation before builder allocation.
- **Minimum passing threshold**: 100% wave tests green, typecheck green, build green, and browser verification filed.
- **Remediation rule**: Defects require new or amended RED tests before fixes.

---

## §11 - Physical Verification Gate (§AD-07)

Every UI wave requires browser-based user-path verification with screenshots or walkthrough evidence.

Minimum evidence:

- Invite login path.
- Paid enrolment path.
- Profile create/edit path.
- Dashboard course-card path.
- Course sidebar/unit viewer path.
- Assessment submission/evaluation path.
- Certificate generation/download path.
- Admin management path.

Evidence location: .agent-admin/evidence/physical-verification/wave-{N}-{YYYYMMDD}/.

---

## §12 - PBFAG Checklist Requirements (§AD-08)

Minimum checks:

1. QA-to-Red suite exists and is red before implementation.
2. Prior wave defects closed or formally deferred.
3. Auth wiring readiness confirmed.
4. Schema alignment confirmed.
5. RLS coverage confirmed for every table in scope.
6. PREHANDOVER proof from prior wave filed.
7. Edge Function Registry current.
8. BUILD_PROGRESS_TRACKER.md current.
9. URL branch/content-source boundary confirmed untouched.
10. AI Gateway path confirmed where assessment evaluation is in scope.
11. Payment webhook/security readiness confirmed where paid enrolment is in scope.
12. Certificate identity-field requirements confirmed where certificates are in scope.

---

## §13 - Agent Authority Chain (§AD-09)

| Role | Authority | Gate Point |
|---|---|---|
| CS2 / Johan Ras | Ultimate authority; approves authoritative App Description and production acceptance. | Governance override and final approval. |
| Product Owner | Defines product intent and acceptance priorities if delegated. | App Description and UX Workflow review. |
| CodexAdvisor | Writes agent contracts where required. | Before agent contract creation/modification. |
| Foreman | Allocates builders, approves wave plans, checks compliance, closes gates. | Before builder allocation and wave closure. |
| QA Agent | Writes QA-to-Red tests and reports defects. | Before PBFAG and builder allocation. |
| Builder | Implements within approved wave scope only. | Build stage only. |
| Data Architecture Agent | Schema-to-hook, migration, RLS, persistence, table pathway validation. | Before DB wave closure. |
| AI Integration Agent | AIMC Gateway and assessment-evaluation contracts. | Before AI-related build. |
| Payment Integration Agent | Checkout/webhook access flow. | Before payment-related build. |

---

## §14 - Schema-to-Hook Validation (§AD-10)

All schema changes and migrations must be verified column-by-column with hooks, server actions, API routes, policies, and UI consumers.

Artifact: .agent-admin/evidence/schema-to-hook/wave-{N}-{YYYYMMDD}.md.

Critical schema areas: learners/profiles, enrolments, courses/modules/learning_units, learner_progress, assessments, assessment_attempts, submissions, evaluations, payments, payment_events, certificates, audit_logs, files/storage metadata.

---

## §15 - Table Pathway Audit (§AD-11)

Before closing any database-touching wave, every database table usage must be inventoried and cross-referenced with migration, RLS, and test coverage.

Artifact: .agent-admin/evidence/table-pathway/wave-{N}-{YYYYMMDD}.md.

Format: Table name | Read/write usage count | Source files | Migration coverage | Test coverage | RLS confirmed | Notes.

---

## §16 - RLS Audit Gate (§AD-12)

Production deployment is blocked until table-by-table RLS review is signed off.

Minimum policy coverage:

- Learners read/update only their own profile data, except certificate-locked fields governed by rules.
- Learners read only their own enrolments, progress, assessment outcomes, payments, and certificates.
- Learners upload/read only their own CV/photo/assessment files.
- Admins manage records according to role permissions.
- AI evaluation functions access only scoped submissions required for evaluation.
- Payment webhooks update only verified payment records through server-side service role.

Artifact: .agent-admin/evidence/rls-audit/wave-{N}-{YYYYMMDD}.md.

---

## §17 - Auth Wiring Checklist (§AD-13)

Required per wave:

- [ ] Auth provider/session handling wraps protected app routes.
- [ ] Protected-route mechanism guards learner dashboard, course, assessment, certificate, and admin pages.
- [ ] Login flow tested end-to-end.
- [ ] Logout flow tested end-to-end.
- [ ] Invitation registration tested end-to-end.
- [ ] Paid enrolment registration tested end-to-end.
- [ ] Session refresh/expiry tested.
- [ ] Learner/admin role separation tested.
- [ ] No mock auth in production build.

---

## §18 - AI Integration Requirements (§AD-14)

All AI/LLM calls must route via AIMC Gateway. Direct provider calls are prohibited.

- **Gateway endpoint**: AIMC_ASSESSMENT_EVALUATION_GATEWAY or final TRS-approved endpoint.
- **Version 1 use cases**: Evaluate uploaded written assignments, practical evidence, or video submissions against assessment rubrics.
- **Structured result required**: Score percentage, pass/fail recommendation, reasoning summary, rubric feedback, resubmission eligibility, confidence/needs-human-review flag.
- **Audit metadata required**: Prompt version, rubric version, submission reference, gateway response ID, evaluator version, final decision.
- **Prohibited**: Client-side AI keys, direct provider SDK/API calls, irreversible high-stakes failure decisions without review/escalation policy.
- **Tests**: Static check for no direct provider usage; integration tests for evaluation schema; failure-mode tests for timeout, low confidence, invalid rubric/file, retry policy.

---

## §19 - Edge Function Registry (§AD-15)

Every serverless invocation must point to a registered, named, deployed function.

Registry: docs/edge-functions/APGI_LEARNING_PORTAL_EDGE_FUNCTION_REGISTRY.md.

Expected functions/endpoints:

- create-invitation
- accept-invitation
- create-checkout-session
- payment-webhook
- record-progress-event
- submit-assessment
- evaluate-assessment-via-aimc
- generate-certificate
- admin-export-report

---

## §20 - Deployment Wave (§AD-16)

The final wave must be Deployment & Commissioning and include:

- Production environment provisioning.
- Database migrations.
- Storage bucket provisioning and access-policy validation.
- Auth provider configuration.
- Payment gateway test/live configuration and webhook verification.
- AIMC Gateway configuration.
- Email service configuration.
- .env.example validation.
- Combined Wave Test execution.
- Production smoke tests.
- Rollback path.
- CWT closure report.

---

## §21 - Secret Naming Convention (§AD-17)

All env vars use UPPERCASE_SNAKE_CASE and must be listed in .env.example.

Expected categories:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- AIMC_GATEWAY_URL
- AIMC_GATEWAY_API_KEY
- PAYMENT_PROVIDER_SECRET_KEY
- PAYMENT_WEBHOOK_SECRET
- EMAIL_PROVIDER_API_KEY
- CERTIFICATE_SIGNING_SECRET
- APP_BASE_URL

---

## §22 - Deployment Runbook (§AD-18)

Runbooks required before deployment wave closure:

- docs/runbooks/APGI_LEARNING_PORTAL_APP_RUNBOOK.md
- docs/runbooks/APGI_LEARNING_PORTAL_DATABASE_RUNBOOK.md
- docs/runbooks/APGI_LEARNING_PORTAL_PAYMENTS_RUNBOOK.md
- docs/runbooks/APGI_LEARNING_PORTAL_AI_ASSESSMENT_RUNBOOK.md
- docs/runbooks/APGI_LEARNING_PORTAL_CERTIFICATES_RUNBOOK.md

Each runbook must include deployment steps, rollback steps, re-deploy instructions, environment notes, smoke tests, and owner.

---

## §23 - Notification/UX Patterns (§AD-19)

alert() is prohibited. Use a root-integrated toast system such as Sonner or TRS-approved equivalent.

- Toasts: save, upload, payment status, progress saved, assessment submitted, certificate generated.
- Inline validation: form-field errors.
- Persistent panels: long-running AI evaluation or payment pending state.

---

## §24 - Shared State Architecture (§AD-20)

- Auth/session state: auth provider/session context backed by server validation.
- Server state: database-backed records fetched through authenticated server actions/API routes.
- UI-only state: component state or lightweight store for sidebar state, full-screen viewer, active tab.
- Progress state: database authoritative; local state may optimistically display but must sync to DB.

Global state inventory:

- Authentication: Auth module.
- Learner profile: Profile module, DB authoritative.
- Course enrolment: Enrolment module, DB authoritative.
- Course progress: Progress module, DB authoritative.
- Assessment: Assessment module, DB authoritative.
- UI viewer state: Course Shell, client-side only unless saved as preference.

---

## §25 - API Authentication (§AD-21)

All session/user-context API endpoints require JWT or equivalent authentication.

Unauthenticated or specially authenticated exceptions:

- Public landing/marketing pages.
- Payment checkout initiation where no learner session exists yet, protected by signed checkout state and server validation.
- Payment webhook endpoint, authenticated by provider signature.
- Invitation landing page token validation, using signed/expiring token.

Protected endpoints include profile, files, enrolment, progress, assessment, AI evaluation, certificates, and admin APIs.

---

## §26 - Audit Log Design (§AD-22)

Logged action types:

- Login/logout/failed login where available.
- Invitation created/accepted/expired.
- Payment checkout created, payment succeeded/failed, refund/manual adjustment.
- Learner profile created/updated.
- File uploaded/deleted.
- Enrolment created/changed/cancelled.
- Progress event recorded/overridden.
- Assessment submitted/evaluated/retried/overridden.
- Certificate generated/downloaded/revoked.
- Admin create/update/delete.
- AI evaluation request/response metadata.

Surfacing: Admin audit log view and database export/query capability.
Deduplication: event_id UUID plus idempotency key for webhook, AI, certificate, and progress events.
Retention: Minimum 7 years for certificate, assessment, payment, and training-critical audit records unless legal/privacy review changes this.

---

## §27 - Tracker Update Requirement (§AD-23)

BUILD_PROGRESS_TRACKER.md must be updated at every wave PR/merge. Wave closure is prohibited unless tracker is current.

- **Tracker location**: modules/apgi-learning-portal/BUILD_PROGRESS_TRACKER.md or repository-approved equivalent.
- **Required entry fields**: Wave number, scope, status, date, evidence links, known issues, deferred items, approval state.

---

## §28 - State Persistence Specification (§AD-24)

| State Item | Storage Location | Retention Policy | Ownership |
|---|---|---|---|
| Auth session | Auth provider/session cookie | Provider session policy | Auth module |
| Certificate identity fields | Database | Retained with learner/certificate record | Profile module |
| Optional professional profile | Database | User-controlled; retained until deletion/account retention | Profile module |
| CV | Object storage + metadata | User-controlled; retained until deletion/account retention | Profile/File module |
| Photograph | Object storage + metadata | User-controlled; retained until deletion/account retention | Profile/File module |
| Enrolments | Database | Permanent training record unless legally removed | Enrolment module |
| Payment records | Database + provider reference | Statutory/payment audit retention | Payment module |
| Course progress | Database | Retained as learner training record | Progress module |
| Current course/unit position | Database; optional local storage convenience | DB permanent; local disposable | Course Shell/Progress module |
| Sidebar collapsed state | Local storage | Until cleared/reset | Course Shell UI |
| Full-screen viewer preference | Local storage | Until cleared/reset | Course Shell UI |
| Assessment files | Object storage + metadata | Assessment retention policy | Assessment module |
| AI evaluation results | Database | Retained with assessment record | Assessment/AI module |
| Certificate PDFs/records | Database + storage | Certificate retention policy | Certificate module |
| Audit logs | Database | Minimum 7 years for critical actions | Audit module |

---

## Optional Sections

### High-Level Feature List

- Learner onboarding and registration.
- Learner professional profile.
- Learner dashboard.
- Course cards and enrolment views.
- Course shell with sidebar progress.
- Embedded iSpring unit viewer.
- Portal-level progress tracking.
- Summative assessment submission and AI evaluation.
- Payment checkout.
- Invitation enrolment.
- Certificate generation.
- Admin management.
- Audit logging and reporting.

### User Personas

- **Learner**: Enrols, builds profile, completes units, submits assessments, prints certificates.
- **APGI Administrator**: Manages learners, courses, enrolments, payments, progress, assessments, certificates.
- **Assessor/Reviewer**: Reviews AI-supported assessment outcomes.
- **Course Publisher**: Publishes iSpring units to the protected URL branch/deployment.
- **Future Tenant Administrator**: Manages branded external organization learning in a later version.

### Key Use Cases

- Invite learner to a course and grant access after profile completion.
- Learner buys a course and receives enrolment after payment confirmation.
- Learner completes a module using embedded iSpring content.
- Learner submits a practical assessment for AI-supported evaluation.
- Learner retakes an assessment according to attempt rules.
- Learner prints/downloads a certificate after completion.
- Admin reviews learner progress and assessment outcomes.
- Admin manually enrols a learner where payment was arranged outside the platform.

### Non-Functional Priorities

- Security: auth, RLS, least privilege, private files, audit logs, payment webhook verification.
- Privacy: protect CVs, photographs, ID numbers, addresses, submissions, certificates.
- Accessibility: WCAG-aligned navigation, keyboard access, readable sidebar, clear forms/errors.
- Performance: fast dashboard/course shell even when embedded iSpring content is heavy.
- Reliability: idempotent progress save events.
- Scalability: schema must not block future multi-tenant/white-label expansion.
- Maintainability: URL branch publishing must remain decoupled from platform releases.
- Assessment Integrity: AI outcomes must be transparent, reviewable, rubric-based, and auditable.

### Similar Platform Lessons Captured for Version 1

- Completion tracking should exist at both activity/unit and course levels.
- Learners need a clear personal dashboard, not just a content catalogue.
- Course navigation should show sequence, progress, and next required action.
- Certificates, payments, progress, and assessment outcomes must be first-class records.
- SCORM/xAPI/LRS should influence the data model, even if Version 1 uses simpler tracking.
- Practical evidence requires submission, evaluation, attempt, feedback, and review workflows.
- Admin reporting and auditability are part of the LMS, not a later add-on.

### Future Evolution Considerations

- Version 2 learner pathway builder with course selection, timelines, discounts, and payment plans.
- Learner CV/professional portfolio generation.
- Employer-facing certificate/profile verification portal.
- Multi-tenant hosting for other companies.
- Tenant branding, custom domains, and course catalogues.
- Advanced assessment moderation, plagiarism checks, identity verification, proctoring, and human assessor workflows.
- SCORM/xAPI/LRS compatibility where required.
- Learning analytics, recommendations, reminders, CPD tracking, and skills matrices.
- Discussion/community features and coaching workflows.

---

## Approval Record

| Action | By | Date | Notes |
|---|---|---|---|
| Draft created | ChatGPT / drafting assistant | 2026-06-03 | Created from Johan Ras product intent and governance app-description canon. |
| Review completed | Pending | Pending | Product owner review required. |
| Authoritative status granted | Johan Ras | Pending | CS2 sign-off required before downstream FRS/TRS/Architecture. |

---

**Document Metadata**:

- Document ID: APGI_LEARNING_PORTAL_APP_DESCRIPTION_V0.1
- Template Basis: governance/templates/APP_DESCRIPTION_TEMPLATE.md
- Policy Authority: governance/policy/APP_DESCRIPTION_REQUIREMENT_POLICY.md v2.0
- Required Sections: §5.1 core sections + §AD-01 through §AD-24 mandatory governance sections
- Pre-Build Authority: governance/canon/PRE_BUILD_STAGE_MODEL_CANON.md v1.1.0

---

**End of APGI_LEARNING_PORTAL_APP_DESCRIPTION**
