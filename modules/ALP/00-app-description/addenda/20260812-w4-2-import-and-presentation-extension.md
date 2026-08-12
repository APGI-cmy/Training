# App Description Addendum — W4.2 Learner Management Extension

Date: 2026-08-12

The administrator learner-management workspace supports safe preparation before the invitation/import lifecycle is authorised.

- An administrator may stage CSV, TSV, text, or `.xlsx` workbook data entirely in the browser.
- A review draft requires valid learner emails plus `company` and `country` headers. `national_identity_number`, `operation_subdivision` and `department_team` are optional fields. National identity numbers stay browser-local, are masked in the manual draft, omitted from draft summaries, and are not logged, placed in URLs, or persisted by this release.
- A staged file does not leave the browser and never creates or matches accounts, invitations, enrolments, import records, emails, or learner progress.
- The existing administrator full-page preview remains the review workspace. A separate presentation-only VPSHR route opens only the published presentation in a viewport-filling new tab; it is admin-gated and read-only.

This addendum does not approve the future bulk-import execution or invitation/email lifecycle.
