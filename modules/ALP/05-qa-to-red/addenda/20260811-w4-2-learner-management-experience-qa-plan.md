# QA-to-Red Addendum — Learner Management Experience

| ID | Expected pre-build failure / required final proof |
|---|---|
| QA-ALP-LMX-001 | No role-gated bounded learner-directory service or Learners navigation exists. |
| QA-ALP-LMX-002 | Existing enrolment page requires an opaque user ID instead of learner-context management. |
| QA-ALP-LMX-003 | Existing invitation form invokes `createInvitation` and can mutate live data. |
| QA-ALP-LMX-004 | No staged local bulk-import template/parser/validation experience exists. |
| QA-ALP-LMX-005 | Admin unit preview has no full-page route/action. |
| QA-ALP-LMX-006 | New UI lacks executable assertions that exclude invitation/enrolment/progress mutation. |

The test suite must be proved RED before the implementation commit, then GREEN alongside typecheck, the established W4.2/B3 suites and production build. Browser validation is limited to read-only admin workflow and full-page preview; it must not create an invitation or alter an enrolment.


| QA-ALP-LMX-009 | A local Excel workbook cannot be selected or cannot form a visible no-write review draft; the reporting columns do not distinguish required company/country from optional organisational fields. |
| QA-ALP-LMX-010 | A VPSHR preview cannot open a separately admin-gated presentation-only viewport without portal chrome, or that route writes learner state. |

Exact-head checks must include `test:alp:lm`, the established W4.2 regression suite, typecheck and the LFS-aware production build. The authenticated smoke must stage (but not execute) both the CSV template and a representative `.xlsx` workbook.
