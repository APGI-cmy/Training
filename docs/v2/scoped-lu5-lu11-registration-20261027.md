# LU5/LU11 correction registration without restarting unchanged LUs

- Johan explicitly selected preserving unchanged LUs and rechecking only LU5
  and LU11 on 27 October 2026.
- The exact transition is scoped to VPSHR round
  `4e26a845-4c1e-442a-87f8-2ad192647b37`, from registered fingerprint
  `37a1df4f248783b6f583595dd3c339586b933ef3dcc342653c4838cee6f4702b`
  to deployed fingerprint
  `b47c284e32ff813100ba0cd63fefb09fcb67146ad73204f681067cecf72e7664`.
- `scripts/verify-vpshr-correction-scope.mjs` reproduces both content hashes
  and proves that only LU5/LU11 unit definitions and package trees changed
  between the prior content and commit `c5e40163793ae3bab8db57396282e922dd4a8043`.
  The deployed shared-engine source is identical. Unknown transitions still
  require full recheck; browser fields cannot select exempted LUs.
- Registration preserves the original reports and their endorsements. Only
  LU5/LU11 coverage is removed for rechecking; the other 11 confirmations stay.
  Reviewers subsequently submit an updated report for the changed version and
  obtain a new independent endorsement. Earlier conclusions remain visible and
  the prior review explanation is prefilled for the updated report.
- Affected blockers reopen. Unchanged implementation/verification evidence
  retains its original author and dates, with explicit fingerprint carry-forward
  provenance. This does not invent an independent verifier or close open issues.
  Prior full documents remain in immutable review history.
- No commercial amounts, principal sign-offs or counter-offer counts change.
  Final content clearance remains separate; changed-content company acceptance
  continues to require reconfirmation where applicable.
- The V2-only migration was exercised against the actual round in a rolled-back
  transaction. Assertions confirmed 11 retained confirmations for each reviewer,
  unchanged reports/endorsements, preserved finding text/replies/screenshots,
  retained LU4 implementation, unchanged deadline instant and commercial terms,
  full recheck for unknown transitions and no anon/authenticated function access.
- TypeScript and 828 tests across 84 files pass. Security advisors report no
  newly introduced function warning; existing unrelated advisories are unchanged.
- QA backup, scope proof, rollback test and release evidence are retained in
  `C:/Users/Johan/Codex-Work/vpshr-registration-20261027/`.

## Applied registration and live verification

- V2 migration `20261027101906_scoped_course_correction_coverage` is applied.
  The actual application `service_role` passed the same rollback assertions.
- Application commit `0132ba23d945214a5a65470adc415a109043f3ef`, deployment
  `dpl_43JEqp6LBC8Ycweijt8gzzWUsEtv`, is READY and promoted to the canonical
  V2 alias. The earlier build was never promoted.
- Johan's signed-in Changes implemented form registered the correction once:
  revision 56 to 57, registered content now `b47c284e32ff`. Both reviewers are
  active with 11/13 confirmations; the only missing coverage is `lu5`, `lu11`.
- Before/after comparisons passed for all 15 finding IDs and their exact text,
  comments, replies, screenshots and earlier versions; both report documents
  and their two endorsements; commercials and counter-offer count. The deadline
  remains 2 November 2026, 17:27 SAST (15:27 UTC).
- LU4's existing implementation remains fixed, with explicit carry-forward
  provenance and independent verification still required. No finding was
  automatically verified or approved.
- The two content-revision notification emails to Johan and Jorrie are `sent`,
  with provider IDs and no recorded delivery error. Both explain the two-LU
  scope and retention of the other 11 confirmations. Inbox placement/opening
  is not confirmed by this provider-acceptance check.
- The live workspace shows the registered release and no unregistered change.
  The saved LU5 finding opens with its original values/reference and an enabled
  Save changes button. No finding or coverage form was submitted during QA.
- A runtime error/fatal scan returned zero records for 10:23:58-10:28:58 UTC
  (12:23:58-12:28:58 SAST) on 27 October 2026. Registration evidence and
  screenshots are stored in the external QA folder.
