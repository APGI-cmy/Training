# Builder Checklist Addendum — Batch 3 Stabilisation

## Entry conditions

- [x] CS2 authority recorded.
- [x] Branch starts from merged PR #101 commit `a056b51d9353426d5ba96154d190ca71ac44f008`.
- [x] App Description, UX, FRS, TRS, Architecture, Requirement Registry, QA and Implementation Plan addenda filed.
- [x] Progress tracker failure and recovery posture committed.
- [x] Executable QA-to-Red committed and proven correctly RED.
- [x] Batch 3 PBFAG records PASS.
- [x] Independent IAA Pre-Brief is published and acknowledged.
- [x] One bounded Lane A builder is formally appointed.

Correct RED is accepted from commit `3d9cc74f83c64e46a9134977e57fec5115691e54`, workflow run `30342160476`. Independent IAA session `IAA-20260728-PREBRIEF-BATCH3-LANE-A` published `.agent-admin/assurance/iaa-prebrief-batch3-lane-a.md`; Foreman and designated builder candidate `BC-ALP-B3-LA-001` acknowledged it in `09-iaa-pre-brief/addenda/20260728-batch3-stabilisation-iaa-acknowledgements.md`. Stage 10 is complete. Stage 11 appointment `APPT-ALP-B3-LA-001` appoints `BC-ALP-B3-LA-001` for the frozen Batch 3 Lane A build-to-Green scope only.

## Lane A build checklist

- [ ] Root and brand routing use one role-aware resolver.
- [ ] Administrator pages use the persistent portal navigation shell.
- [ ] Dashboard cards and totals include enrolled courses only.
- [ ] My Learning includes actual enrolled/pending/revoked relationships only.
- [ ] Catalogue remains complete and state-aware.
- [ ] VPSHR and Scannex use one shared course-overview pattern.
- [ ] Public pages do not expose protected raw-unit links.
- [ ] Access-denied recovery derives from the active course slug.
- [ ] Admin preview is role-gated and writes no enrolment/progress state.
- [ ] VPSHR unit assets load through the safe path resolver.
- [ ] No payment, email-provider or secret implementation is introduced.

## Build-to-Green proof

- [ ] Lane A tests GREEN without assertion weakening.
- [ ] Existing W1 regression GREEN.
- [ ] Existing W4.1 regression GREEN.
- [ ] Existing W4.2 regression GREEN.
- [ ] Typecheck GREEN.
- [ ] Production build GREEN.
- [ ] Exact-head GitHub workflow GREEN.
- [ ] Exact-head Vercel preview READY for relevant projects.
- [ ] Browser retest PASS.
- [ ] Controlled data retained until browser proof accepted.

## Handover prohibition

No merge recommendation may be posted while any checklist item above that applies to Lane A remains incomplete.
