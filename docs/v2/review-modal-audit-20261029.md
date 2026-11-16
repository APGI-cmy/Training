# LU review workflow audit — 29 October 2026

## Scope and method

Read-only database snapshot: active VPSHR round `4e26a845-4c1e-442a-87f8-2ad192647b37`, revision 79, and Tiger Kidnapping round `f1ef8430-64d6-410d-abdf-18a1c0260ded`, revision 35. The cancelled VPSHR predecessor remains historical and was not reopened.

The audit covers all 21 current LU workspaces: 13 VPSHR units and 8 Tiger units. Actual saved records were rendered in 66 actor/LU combinations, including the two-person VPSHR team and five-person Tiger team. All four stages were checked in each combination: 264 stage views. These are role-rendering and rule checks with captured data, not impersonated sign-ins. The signed-in browser check uses Johan's own account.

Audit snapshots, the per-actor matrix, logs and browser evidence are stored outside OneDrive at `C:/Users/Johan/Codex-Work/review-modal-audit-20261029/`. No review, coverage confirmation, endorsement, implementation response or email resend is submitted by this audit.

## Findings and corrections

1. **Unchanged declaration endorsements were not consistently retained.** Registration preserved their historical records, but the workflow only accepted endorsements with the current course fingerprint. Finding-level carry-forward previously covered implemented issues, not nothing-to-add declarations. The shared rule now follows registered, explicit unchanged-LU transitions for both kinds of record. Changed LUs, edited findings, course-wide findings, missing scope evidence and broken version chains require fresh decisions. Historical endorsement timestamps and payloads are not rewritten.
2. **Client and server needed the same preservation evidence.** The working-view snapshot omitted registration scope metadata. It now includes only version identifiers and changed/preserved unit lists, with release notes and deployment references excluded. Modal colours, task generation and publication blockers use the same evidence.
3. **A red Endorsements stage did not explain the remaining work.** The stage now lists the exact outstanding records and eligible endorsers, alongside the number already closed. It does not turn green merely because another record in the LU was endorsed.
4. **Some V3 emails retained obsolete full-report instructions.** Correction and additional/replacement-reviewer messages now describe LU review and direct Yes/No endorsement. Legacy workflows retain their previous wording. Existing sent messages remain historical; the audit sends no replacement emails.

## LU4 — Thirty Human Rights

Both reviewers' Initial review is complete. Implementation feedback is complete and no reopen is outstanding. Two of its three records are endorsed. The remaining record is Johan's **Quizzes** finding `4e030b6a-24df-41e9-948c-93bbc5db6394`, with an implementation response but no independent endorsement. Jorrie is the eligible endorser. Therefore the screenshot's red Endorsements label is correct for this remaining record.

Johan's two endorsements of Jorrie's satisfactory declarations are present in history. The snapshot also contains repeat endorsements recorded on 29 October after the LU1 registration. None are deleted or replaced. LU6's earlier satisfactory-declaration endorsement should be retained automatically after this fix; its separate quiz finding remains pending endorsement.

## Rules checked

- Personal completion and team completion are displayed separately. Team Initial review requires every active primary content reviewer to confirm LU coverage and have a saved finding/declaration. One person's checked box does not complete the team stage.
- Changed-unit coverage must be reconfirmed; unchanged coverage and saved records remain intact. Missing per-LU declarations are identified separately from missing coverage.
- Designer implementation submission completes Implementation feedback and moves directly to Endorsements. No duplicate acceptance decision is introduced.
- Only the assigned designer can submit implementation notes. Private drafts do not create public numbered responses.
- A second numbered response requires a rejection/reopen and a subsequent designer submission. No creates a reopen and requires a reason; Yes closes the record with one eligible independent endorsement.
- Self-endorsement is prohibited. Other reviewers' finding text is read only; reviewer and designer controls differ by permission, while stage colours remain team-wide and identical.
- Teams with five reviewers use the same one-endorsement rule. Every reviewer does not have to endorse every record.
- Course-wide findings appear in each applicable LU while retaining one canonical record.
- Stale finding/response identifiers, changed deployments, expired/cancelled reviews and concurrent saves are guarded on the server.
- Notification inboxes and read receipts remain recipient-owned; sent-message tracking is separate. Reading does not endorse, close or confirm coverage.
- Content review, final clearance, commercial/branding decisions and publication remain distinct.

## Limits

Real reviewers' accounts were not impersonated and no live Yes/No decision was submitted as a test. Role rendering, authorization and state transitions were checked automatically with captured live data and isolated fixtures. This is a workflow audit, not a new content/quiz correctness review or learner-course publication.

## Validation before release

- 882 release tests passed across 93 files. The optional captured-data audit is skipped in the ordinary suite and was run separately: 67 checks passed, covering 66 actor/LU combinations and the exported matrix.
- TypeScript and the optimized production build passed. The historical package test exceeded its default five-second limit during a concurrent run; the complete suite passed with a bounded twenty-second test timeout.
- All 85 MP4 files are real materialized media. Environment isolation checks passed. Review package manifests regenerated without a Git change, so this interface repair does not change course identity or require correction registration.
- No database migration is required. Existing records are interpreted from their registered preservation evidence; no bulk rewrite, data reset or fabricated endorsement is performed.

## Hosted release verification

- Source `c751895d6fe9d068c78f4954e25324d7a849eeb9`, deployment `dpl_y9UictFxXMMT1WPPUWi6225V1snQ`: READY and promoted. The alias API confirms `training-platform-v2-staging.vercel.app` points to this exact deployment in project `prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf`. The public sign-in page returns HTTP 200.
- Hosted build completed successfully. A local-build chunk filename differed from the hosted build and returned 404 when requested directly; that probe is not a failed application route or a verified visual result.
- After-audit read-only comparison: Tiger revision 35, VPSHR revision 79 and cancelled predecessor revision 56 are unchanged. All three complete documents compare equal to their captured baselines, including findings, coverage, reports, endorsements and commercial history.
- Browser limitation: Johan's signed-in pre-release LU4 view confirmed the two closed declarations and separate pending quiz finding. Final visual verification stopped when the Windows computer-control tool could not reliably determine Edge's current URL. No alternate browser-control method or other reviewer's session was used. Post-release UI verification is limited to role-rendering tests and deployment provenance, not a fresh signed-in visual check.
- The readable per-LU audit is saved at `C:/Users/Johan/OneDrive/Documents/ChatGPT/Training portal platform/Review workflow audit 2026-10-29/Review workflow audit.html`.
