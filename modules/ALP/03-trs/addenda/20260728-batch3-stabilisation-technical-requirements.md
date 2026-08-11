# TRS Addendum — Batch 3 Stabilisation

## Technical requirements

| ID | Requirement |
|---|---|
| TR-ALP-B3-001 | Root routing shall resolve the current server-side session and roles without client-only flicker. |
| TR-ALP-B3-002 | Brand routing shall use the same destination resolver as successful sign-in. |
| TR-ALP-B3-003 | Navigation shall be generated from one role-aware route model. |
| TR-ALP-B3-004 | Dashboard course queries shall combine course definitions with live access decisions and retain only `enrolled`. |
| TR-ALP-B3-005 | My Learning shall retain `enrolled`, `pending` and `revoked` only. |
| TR-ALP-B3-006 | Shared course overview components shall accept generic `Course` and access decision data. |
| TR-ALP-B3-007 | Public course pages shall not emit direct protected `publishedPath` links. |
| TR-ALP-B3-008 | Admin preview shall be protected by `requireAdmin()` and shall not create or modify enrolment rows. |
| TR-ALP-B3-009 | Course access denial recovery URLs shall derive from `course.slug`. |
| TR-ALP-B3-010 | VPSHR unit asset resolution shall use the same safe single-encoding helper proven for Scannex. |
| TR-ALP-B3-011 | Invitation creation shall expose a typed delivery status and shall never report `sent` without a successful provider response and audit event. |
| TR-ALP-B3-012 | Delivery-provider credentials shall be server-only Vercel environment variables and never use `NEXT_PUBLIC_`. |
| TR-ALP-B3-013 | Lane A and delivery-preflight tests shall be included in an exact-head CI command and path trigger. |
| TR-ALP-B3-014 | Existing W1, W4.1 and W4.2 regressions, typecheck and production build shall remain green. |

## Fail-closed rules

- Missing session or role lookup failure routes to sign-in, not privileged content.
- Access-decision failure denies governed content.
- Admin preview failure does not fall back to raw assets.
- Delivery-provider absence leaves invitation in created/not-sent posture.
- No secret, token hash or raw token may appear in logs.