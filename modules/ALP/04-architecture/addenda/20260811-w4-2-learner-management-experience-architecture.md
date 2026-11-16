# Architecture Addendum — Learner Management Experience

The LMX slice adds three presentation/read-model seams:

| Seam | Responsibility | Write boundary |
|---|---|---|
| `getAdminLearners` | `requireAdmin()`-guarded, bounded profiles/enrolments read model for directory pages | Read only |
| Admin management components | Search/paging, learner context, invitation draft and local import validation | Browser-local state only |
| Admin full-page preview | Full-viewport iframe of governed published source | Read only; no progress/enrolment imports |

The existing `createInvitation` and `changeEnrolmentStatus` server actions remain the future governed write seam but are not called by the new UI. The existing email-delivery preflight and its provider, DNS, secret, audit and retry decisions remain mandatory before any delivery capability is added.


## 2026-08-12 extension — local spreadsheet staging and presentation-only preview

| Seam | Responsibility | Write boundary |
|---|---|---|
| Workbook reader | Reads the first worksheet from a user-selected `.xlsx` ZIP in the browser using built-in Web APIs; CSV/TSV remains supported. | File bytes stay in browser memory; no API call or persisted import record. |
| Import validator | Requires `email`, `company` and `country`; recognises optional `operation_subdivision` and `department_team`. | A visible draft is UI state only; it never matches or creates accounts. |
| Presentation-only route | Admin-gated iframe page with root portal chrome removed by route-mode CSS. | Reads published unit content only; no progress, enrolment or access event. |

The workbook parser intentionally adds no package or server upload surface. Unsupported or unreadable workbooks must instruct the administrator to save as CSV; import execution remains separately governed.
