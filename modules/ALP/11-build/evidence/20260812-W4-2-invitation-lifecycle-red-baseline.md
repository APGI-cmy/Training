# W4.2 Persistent Invitation Lifecycle — RED Baseline Evidence

Date: 2026-08-12  
Baseline: main merge commit `22d9f0cd5ccfa488f544f7d07ebb2fa3317c1c41`

## Read-only live inspection

- Project: `apgi-learning-portal` / `ooujszdvncwijbuzpjfp`, status ACTIVE_HEALTHY.
- Existing foundations: `profiles`, `course_invitations`, `course_invitation_events`, `course_enrolments`, `course_enrolment_events`, `audit_events`, `file_metadata`, and private `alp-private-files` Storage.
- Existing creation action hashes a random invitation token and writes a creation event. Existing acceptance redirects directly to `/learn/:courseId`.
- No Edge Functions are deployed for this lifecycle.
- No migration exists for persistent onboarding/national-ID protection or dedicated CV policy.
- Auth logs show email/password sign-in working. Deployment work must correct the deprecated GoTrue group configuration and enable leaked-password protection.
- Supabase Security Advisor reports invitation tables with RLS but no policies, and publicly executable SECURITY DEFINER functions. These are build blockers for the persistent lifecycle; no live change was made in this RED phase.

## Correct RED classification

| QA IDs | Result | Classification |
|---|---|---|
| QA-IL-001 | Fails: create action lacks revoke/resend lifecycle | Intended missing capability |
| QA-IL-002 | Fails: persistent lifecycle migration absent | Intended missing capability |
| QA-IL-003 | Fails: no send/idempotency/failure workflow | Intended missing capability |
| QA-IL-004 | Fails: acceptance routes directly to learning, not onboarding | Intended missing capability |
| QA-IL-005 | Fails: grouped route lacks explicit lifecycle failure handling | Intended missing capability |
| QA-IL-006..008 | Fail: no onboarding/profile protection/CV lifecycle implementation | Intended missing capability |
| QA-IL-009 | Fails: no idempotent redemption service | Intended missing capability |
| QA-IL-010 | Fails: no governed import execution service | Intended missing capability |
| QA-IL-011 | Passes: AMC coverage manifest exists | Expected prebuild control |

No accidental test/setup defect is accepted: the route assertion targets the actual grouped route, and all expected failures map to absent product capabilities. The CI harness must reproduce this result before builder appointment.
