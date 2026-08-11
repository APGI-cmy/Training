# TRS Addendum — Learner Management Experience

| ID | Technical requirement |
|---|---|
| TR-ALP-LMX-001 | Learner directory queries shall execute only after `requireAdmin()` and use bounded page size, ordered server-side reads and a server-side search filter. |
| TR-ALP-LMX-002 | Directory data shall join profiles and enrolments only by existing user identifiers and shall not expose invitation tokens, hashes or service secrets. |
| TR-ALP-LMX-003 | Draft invitation and staged-import controls shall be client-only; their handlers must call neither invitation nor enrolment server actions. |
| TR-ALP-LMX-004 | Local import parsing shall accept CSV/TSV/text only in this slice; Excel workbook execution is explicitly deferred pending an approved lifecycle and server-side validation design. |
| TR-ALP-LMX-005 | The full-page preview route shall call `requireAdmin()`, derive the published source with `encodeAssetPath`, and import no progress/enrolment actions. |
| TR-ALP-LMX-006 | New tests shall prove role guard, bounded directory query, staged-only invitation/import controls and no-mutation preview properties. |
