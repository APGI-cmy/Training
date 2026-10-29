# Unanimous initial review without findings

Requested protocol: when all assigned full content reviewers complete a learning
unit and explicitly record that nothing needs changing, its content review ends
without peer endorsements. This applies to every course and team size.

## Behaviour

- Each assigned full reviewer must use a distinct verified account, confirm LU
  coverage and save a current-version nothing-to-add declaration. At least two
  full reviewers are required. An invited reviewer who has not finished prevents
  this shortcut.
- All four LU stages become complete together. The modal and course tracker show
  a clear no-findings result. They do not claim an endorsement was received.
- While the remaining initial reviews are outstanding, satisfactory declarations
  show **Awaiting team review** and do not generate premature endorsement tasks.
- If an issue, suggestion, correction or rejected endorsement exists for the LU,
  the existing implementation/reopen/endorsement workflow applies. Superseding an
  issue with a satisfactory declaration cannot erase that requirement.
- Editing a satisfactory declaration preserves its earlier outcome, so a typo
  correction does not manufacture an issue. Unknown earlier outcomes do not
  silently qualify as a clean initial review.
- A new finding immediately removes the shortcut. Changed content still requires
  current-version review evidence; registered unchanged-unit evidence is retained.
- Course-wide declarations qualify only when every applicable LU is complete.
- Once all LUs qualify, the whole content review is complete and optional peer-only
  endorsements are no longer required. Final content clearance, commercial and
  branding approvals, and the explicit publication action remain separate.

The rule is derived from the existing saved records. It does not create an
endorsement, verifier identity, verification timestamp or bulk data rewrite.
Existing findings, coverage, screenshots, comments and endorsements remain saved.

## Validation

The full release suite passes 906 tests across 95 files, including designer and
reviewer modal renders for two- and five-person teams. Tests cover missing
coverage/declarations/accounts, same-account attempts, declines, early
endorsement suppression, added or superseded issues, previous rejections,
changed/unchanged versions, course-wide declarations, peer-only task waiver,
publication boundaries and stale endorsement forms. TypeScript passed. The local
optimized build passed before the accompanying guidance wording was aligned;
the final hosted build verifies the complete release.

Release identifiers and hosted checks are appended after deployment.
