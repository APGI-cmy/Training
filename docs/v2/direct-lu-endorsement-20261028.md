# Direct endorsement after implementation

The shared LU workflow now moves directly from a submitted implementation response to Endorsements. Implementation feedback is complete once every issue has a first submitted response; waiting for endorsement does not keep that step red. A No endorsement requires a reason and opens a correction round. The next numbered implementation exists only after the designer submits it. One eligible Yes endorsement closes the record, including on larger teams.

The finding's original reviewer can endorse the designer's response. The implementation writer cannot endorse their own correction. For a satisfied/no-change review declaration, the author still requires another reviewer. The former separate acceptance form and action notifications are removed; stale clients receive an explanatory rejection before saving. Earlier decisions and completed checks remain valid historical evidence without creating new acceptance events.

Initial review remains separate: each assigned full content reviewer must confirm coverage and save their LU finding or declaration. Registering a changed package can reopen the affected coverage; generating a notification never clears coverage. Existing Introduction, LU5 and LU11 rechecks remain outstanding for Jorrie. No coverage, finding, report, response or endorsement is reset by this release.

## Verification

- TypeScript and 862 release tests passed, plus the added six-person direct-endorsement notification test. Coverage includes two-person teams, original-author endorsement, prevention of implementation self-endorsement, reasoned No/reopen, sequential response numbering, version checks and preservation of earlier two-decision evidence.
- Thirteen database checks passed inside a rolled-back transaction, including direct original-reviewer endorsement, historical closure, no self-endorsement, missing coverage, stale content and reopened findings.
- Applied V2 migration: `20261028120335_lu_direct_implementation_endorsement`. Only the publication-readiness function changes; service-only grants and SECURITY INVOKER remain. Security advisor findings are unchanged.
- Real VPSHR review remained revision 73, 16 findings and 2 reports, document MD5 `f80683bc45a3442e574e52ffa1cf20f3` before and after migration. Course manifests for three courses and 83 media files passed prebuild without changes.

Live release evidence is recorded after deployment below.
