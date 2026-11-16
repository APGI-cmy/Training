# Readable feedback and commercial summaries

The commercial version card now separates minimum and proposed learner fees,
counter-offer usage and the full saved version reference into labelled facts.
Recorded commercial terms appear under topic headings with sentence bullets:
pricing, costs and contingency, sharing and recovery, design credit, ownership
and draft/approval boundaries. Independent decisions have separate reviewer,
status, timestamp and explanation areas.

The shared display is also used for saved course plans, ownership previews,
company offers, commercial assignments, feedback summaries, LU feedback,
submitted and earlier reports, peer explanations and correction notes.
Existing report headings and plain-text bullets become semantic headings/lists.
Long references and text wrap; summaries use the page scroll instead of a small
scrolling preformatted box.

This is presentation only. Saved text is segmented for display, not rewritten,
recalculated or resaved. Earlier and unfamiliar terms remain visible. No change
to commercial calculations, recovery base, ownership conditions, role access,
approval gates, review fingerprints or notifications is included.

## Validation

- TypeScript: passed.
- Release suite: 769 tests passed across 76 files, including commercial privacy,
  review ordering and saved-text preservation coverage.
- Course media: 82 MP4 objects verified; LFS files materialized.
- Source and dependencies remain in the existing physical V2 worktree outside
  OneDrive. No dependency trees, junctions or symlinks added under OneDrive.
- Final implementation: `505f48ef0de91be200ee07a06e8c34807850cebb` (includes
  `ed2843a3` summary display and `8469ee0a` card spacing).
- V2 staging deployment `dpl_272XDgim9Fh9RKFv9BD92mmZRTk8`: READY and promoted
  to `https://training-platform-v2-staging.vercel.app`. The canonical alias,
  project `prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf` and exact implementation commit
  were verified. V1, payments and Viewer configuration remain untouched.
- Signed-in Tiger/NKS review: all ten commercial topic sections and ten saved
  findings display. The full commercial text and report text matched the
  earlier display (ignoring whitespace and heading punctuation). The content
  fingerprint is unchanged. No form was submitted, no review was registered
  and no notification was requested during verification.
- Six saved course plans also showed the shared topic headings. No horizontal
  page overflow was observed. Final card styles were checked in the browser:
  labels sit above values, with the intended card padding.

QA evidence is in `C:/Users/Johan/Codex-Work/review-summary-layout-20261026/`:
`tests.log`, `typecheck.log`, `deployment-release.json`, `alias-release.json`,
`live-comparison.json` and `live-commercial-summary.jpg`. The final runtime
scan returned zero error/fatal records for 16:23:53–16:33:53 UTC on 26 October
2026 (18:23:53–18:33:53 SAST).
