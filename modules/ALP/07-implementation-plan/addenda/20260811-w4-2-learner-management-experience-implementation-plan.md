# Implementation Plan Addendum — Learner Management Experience

1. Reconcile PR #102 production release evidence in the tracker.
2. Add the LMX authority stack and executable QA-to-Red suite.
3. Prove correct RED before product code.
4. Implement the bounded admin learner read model and directory.
5. Replace raw invitation/enrolment forms with safe draft/context workflows and staged local import validation.
6. Add the full-page administrator preview route/action.
7. Run scoped QA, typecheck and production build; create a non-production preview.
8. Perform read-only browser proof with an administrator; do not create invitations or change enrolments.
9. Submit a draft PR for independent review; do not merge or deploy production automatically.


## 2026-08-12 approved extension

10. Extend local staging to first-class CSV and Excel workbook selection, with mandatory `email`, `company` and `country` and optional organisational reporting dimensions.
11. Make the local import-review draft visibly observable; retain the no-upload/no-execution boundary.
12. Preserve the existing admin full-page workspace and add a separate new-tab presentation-only preview for VPSHR.
13. Update QA, architecture, requirements and release evidence; verify the new exact head in GitHub Actions and both Vercel preview projects.
