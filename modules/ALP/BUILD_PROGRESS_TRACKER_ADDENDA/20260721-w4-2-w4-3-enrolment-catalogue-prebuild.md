# BUILD PROGRESS TRACKER Addendum - W4.2 Enrolment/Catalogue Prebuild and W4.3-W4.5 Payment Roadmap

## Status update

| Item | Updated posture |
|---|---|
| PR #92 | Merged on 2026-07-21 as `a0c0944a8399c97c90817916f74140c5369daede` |
| PR #92 deployment | Vercel passed |
| Navigation-loop finding | Resolved for observed dashboard/profile/public/not-enrolled paths |
| W4.1 browser proof | Partially accepted; enrolled, pending, revoked and unknown/error remain |
| W4.1 closure | Not claimed |
| W4.2 | Prebuild filed; executable RED and implementation not started |
| W4.3 | Payment status model only; not started |
| W4.4 | Provider/security/risk decision; not started |
| W4.5 | Payment execution; not started and not authorized |
| W4 | Remains open |
| Payment readiness | Not claimed |
| ALP-CTRL-010 | Open and carried forward |

## Linked authority artifacts

- GOV-ALP-094: `modules/ALP/11-build/evidence/20260721-W4-GOV-ALP-094-decision-enrolment-catalogue-prebuild.md`
- App Description: `modules/ALP/00-app-description/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-addendum.md`
- UX: `modules/ALP/01-ux-workflow-wiring/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-workflows.md`
- FRS: `modules/ALP/02-frs/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-requirements.md`
- Requirement Registry: `modules/ALP/REQUIREMENT_REGISTRY_ADDENDA/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-registry.md`
- Canonical Stage 6 expansion QA: `modules/ALP/05-qa-to-red/addenda/20260721-w4-2-w4-5-enrolment-catalogue-payment-roadmap-qa-plan.md`
- Canonical tracker: `modules/ALP/BUILD_PROGRESS_TRACKER.md`
- Evidence index: `modules/ALP/11-build/evidence/index.md`

## Next authorized action after merge

1. Add executable QA-ALP-252 through QA-ALP-267 tests for W4.2.
2. Confirm correct RED.
3. Open a separate W4.2 build branch.
4. Implement only the generic catalogue/sidebar, redirect inventory, admin authorization, invitation/manual enrolment and access-management slice.
5. Assign `admin` to `johan.ras@apginc.ca` only during that controlled implementation/proof cycle.
6. Build W4.2 to green and capture browser/database proof with test-data cleanup.
7. Start W4.3, W4.4 and W4.5 only as separate later reviewed cycles in that order.

## Prohibited before this prebuild merges

No live role assignment, enrolment/invitation/payment/offer write, migration, application-code change, legacy-route deletion, provider setup, payment-readiness claim, or W4.1/W4 closure claim is permitted.
