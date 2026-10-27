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
- TypeScript and 827 tests across 84 files pass. Security advisors report no
  newly introduced function warning; existing unrelated advisories are unchanged.
- QA backup, scope proof, rollback test and release evidence are retained in
  `C:/Users/Johan/Codex-Work/vpshr-registration-20261027/`.
