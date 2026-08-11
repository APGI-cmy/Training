# Architecture Addendum — Learner Management Experience

The LMX slice adds three presentation/read-model seams:

| Seam | Responsibility | Write boundary |
|---|---|---|
| `getAdminLearners` | `requireAdmin()`-guarded, bounded profiles/enrolments read model for directory pages | Read only |
| Admin management components | Search/paging, learner context, invitation draft and local import validation | Browser-local state only |
| Admin full-page preview | Full-viewport iframe of governed published source | Read only; no progress/enrolment imports |

The existing `createInvitation` and `changeEnrolmentStatus` server actions remain the future governed write seam but are not called by the new UI. The existing email-delivery preflight and its provider, DNS, secret, audit and retry decisions remain mandatory before any delivery capability is added.
