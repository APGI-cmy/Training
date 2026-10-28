# Personal and team LU review status

The LU tracker is labelled **Team LU workflow**. The Initial review stage separately shows the signed-in reviewer's own completion, the team's completion count, and each outstanding reviewer's missing coverage or finding/nothing-to-add declaration.

The display and existing stage gate use the same derived initial-review progress. The rule remains: at least two eligible full content reviewers, each with confirmed coverage and a saved LU record. The implementation, reopened-round and endorsement rules are unchanged.

An own finding awaiting endorsement now says **Your implementation response is complete. Awaiting endorsement from one other reviewer.** A satisfied declaration instead says that the declaration is saved and awaiting endorsement. These messages use a pending style with an amber edge. Green closure messages remain reserved for closed records. The Endorsements stage explains that every record for the LU must be closed for the team step to complete.

Verification: 855 release tests in 89 files, TypeScript, environment isolation, media checks and review manifests passed. New coverage distinguishes personal completion from team completion, identifies a missing declaration despite saved coverage, preserves course-wide scope and reviewer eligibility, and checks the pending message. Course content fingerprints remain unchanged. No migration, review-data reset, new reviewer decision or course publication is required.

Feature source commit: `fce13edeffa5ba7a3ebc59ea48aa915b70633e8b`.

## Live verification

Deployment `dpl_2JD8NzdxpPkBUDjcRLdibVL9rPhy` is READY and promoted to `training-platform-v2-staging.vercel.app`; the alias API confirms the intended V2 project and deployment.

Signed-in LU2 (Responsibilities) verification showed:

- **Your initial review: Complete**.
- **Team initial review: 1 of 2 reviewers complete**.
- The outstanding team item identifies `jorrie.jordaan@apginc.ca` and requests a saved finding or nothing-to-add declaration.
- The same existing personal coverage checkbox remains confirmed and saved. Team Initial review and Endorsements remain red under the unchanged rules.
- The endorsement stage still reports **No peer endorsements received yet**. Its message is **Your review declaration is saved. Awaiting endorsement from one other reviewer** because this saved record is a satisfied declaration. The pending message uses an amber border (`rgb(184, 121, 23)`) and is not styled as green success.
- No reviewer submission, endorsement, approval, read receipt, or data reset was performed during verification. The bounded deployment error/fatal log query returned zero records.

Screenshot evidence is saved in `C:/Users/Johan/OneDrive/Documents/ChatGPT/Training portal platform/Review status clarity - 2026-10-28`.
