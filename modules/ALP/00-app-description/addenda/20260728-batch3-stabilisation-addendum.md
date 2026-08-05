# App Description Addendum — Batch 3 Stabilisation

## Status

| Field | Value |
|---|---|
| Module | ALP — APGI Learning Portal |
| Addendum ID | AD-ALP-B3-STABILISATION-20260728 |
| Parent | `modules/ALP/00-app-description/APGI_LEARNING_PORTAL_APP_DESCRIPTION.md` |
| Authority | CS2-authorised by Johan Ras on 2026-07-28 |
| Scope | Bounded Batch 3 recovery and stabilisation |

## Trigger

Controlled browser proof after PR #101 confirmed the role-aware sign-in and Scannex asset-path repairs, but exposed broader portal and course-flow failures:

- the deployment root and brand route to the VPSHR public page instead of the portal entry;
- administrator screens use an incomplete parallel navigation shell;
- the learner dashboard presents all published courses as assigned learning;
- VPSHR public and governed routes create misleading access-gate loops;
- VPSHR and Scannex course presentation and launch behaviour are inconsistent;
- public Scannex unit links can bypass the governed learner shell;
- invitation creation persists a token and audit state but does not deliver an email.

## Required product correction

ALP remains one multi-course governed LMS. It shall provide:

1. a role-aware portal entry;
2. one coherent navigation model for learner and administrator roles;
3. dashboard cards limited to active enrolled learning;
4. My Learning limited to actual enrolment relationships;
5. catalogue cards for all published courses;
6. one shared course-overview and governed course-shell pattern for VPSHR and Scannex;
7. role-gated administrator preview without manufacturing learner enrolment;
8. no direct public bypass to protected learning-unit assets; and
9. a separately governed invitation-delivery capability after provider and secret-management preflight.

## Boundaries

Lane A may repair portal entry, navigation, dashboard filtering, course presentation, generic links, admin preview and regression coverage. It may not send email, add a provider, add secrets, implement payments, close W4.2/W4, or claim production readiness.

Invitation delivery is a separate preflight lane. No provider implementation may begin until provider, sender identity, domain authentication, environment ownership, data minimisation, retry/failure handling and audit requirements are approved.