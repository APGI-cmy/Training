# FRS Addendum — Batch 3 Stabilisation

## Status

CS2-authorised 2026-07-28. This addendum corrects the live browser failures found after PR #101.

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FR-ALP-B3-001 | Root and brand navigation shall be role-aware. | Anonymous → sign-in; admin → admin; learner → dashboard. |
| FR-ALP-B3-002 | Administration shall use the persistent portal navigation shell. | Overview, invitations, access management, preview, dashboard, catalogue, profile and sign-out are available. |
| FR-ALP-B3-003 | Dashboard shall show active enrolled courses only. | Published-but-unenrolled, pending and revoked courses do not inflate dashboard cards or totals. |
| FR-ALP-B3-004 | My Learning shall show actual enrolment relationships only. | Enrolled, pending and revoked entries are distinct and state-aware. |
| FR-ALP-B3-005 | Catalogue shall remain the complete published-course inventory. | All published courses appear with learner-specific state and action. |
| FR-ALP-B3-006 | VPSHR and Scannex shall use a shared course-overview pattern. | Equivalent structure, styling, status and actions are rendered from generic course data. |
| FR-ALP-B3-007 | Protected units shall not be exposed through public raw-asset links. | Unit launch requires governed course access or role-gated admin preview. |
| FR-ALP-B3-008 | Course access recovery links shall be course-specific. | No VPSHR hard-coding for other courses. |
| FR-ALP-B3-009 | Administrators shall preview a course without learner enrolment mutation. | Preview is role-gated, labelled and auditable where required. |
| FR-ALP-B3-010 | Enrolled VPSHR learners shall reach real unit content. | Shell and unit route resolve the published VPSHR asset successfully. |
| FR-ALP-B3-011 | Invitation creation shall not imply delivery when no message is sent. | UI distinguishes created, sent and failed delivery states. |
| FR-ALP-B3-012 | Email delivery implementation requires separate approved preflight. | Provider, sender, domain, secrets, retry, privacy and audit controls are approved first. |
| FR-ALP-B3-013 | Every correction shall have executable QA-to-Red before implementation. | Tests fail against pre-repair main and pass only after Lane A implementation. |
| FR-ALP-B3-014 | Controlled Batch 3 evidence shall remain until final retest. | No cleanup before browser proof passes. |

## Explicit exclusions

No payment execution, provider webhook, offer code, W4 closure, production-readiness claim or deletion of controlled evidence is authorised.