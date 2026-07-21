# BUILD_PROGRESS_TRACKER Addendum - W4.2/W4.3 Enrolment and Catalogue Prebuild

## Status update

| Item | Updated posture |
|---|---|
| PR #92 | Merged on 2026-07-21; merge commit `a0c0944a8399c97c90817916f74140c5369daede` |
| PR #92 deployment | Vercel check passed |
| Navigation-loop finding | Resolved for observed dashboard/profile/public/not-enrolled paths |
| W4.1 DB proof | Closed previously |
| W4.1 browser proof | Partially accepted; enrolled, pending, revoked and unknown/error states remain outstanding |
| W4.1 closure | Not claimed |
| W4.2 | Prebuild filed; implementation not started |
| W4.3 | Prebuild requirements defined; sandbox implementation not started |
| W4 | Remains open |
| Payment readiness | Not claimed |
| ALP-CTRL-010 | Remains open and carried forward |

## Current authorized workstream

Review and merge the W4.2/W4.3 enrolment and course-catalogue prebuild artifacts only.

## Next authorized action after merge

1. Add executable QA-to-Red tests for W4.2 catalogue, admin authorization, invitations, redemption, revocation and reinstatement.
2. Confirm those tests fail for the absent behaviour.
3. Open a separate W4.2 build branch.
4. Implement only the authorized generic catalogue/sidebar, legacy redirect inventory, admin authorization, invitation/manual enrolment and access-management slice.
5. Assign the existing `admin` role to `johan.ras@apginc.ca` only during that controlled implementation/proof cycle.
6. Build to green and capture browser/database proof with controlled test-data cleanup.
7. Start W4.3 payment/offer-code sandbox work only through a later separately reviewed build cycle.

## Prohibited before this prebuild merges

- No live role assignment.
- No live enrolment, invitation, payment or offer-code writes.
- No database migrations.
- No application-code or route changes.
- No deletion of legacy landing pages.
- No payment-provider setup or readiness claim.
- No W4.1 or W4 closure claim.