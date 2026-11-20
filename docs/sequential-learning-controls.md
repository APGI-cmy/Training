# Shared sequential learning controls

Implementation for the next common APGI V2 / partner release, version
`2.0.20261120.2`. Publication and live verification are recorded separately in the
release coordinator evidence; a source change alone is not proof of deployment.

## Behavior and coverage

Required sections unlock in their authored order. Begin opens the first required
section, previously unlocked sections remain usable, and Summary opens only
after the required exploration. A decision screen keeps its answer alternatives
available together; it never treats answer options as a sequence of required
answers. Viewing an activity summary is navigation evidence, not a quiz pass.

Tiger has priority in acceptance checks: LU1 slide 6 is the reported regression.
All 28 Tiger embedded activities are covered, including the corrected LU3-LU5
packages, foundational activities, interactive diagrams and decision screens.
The same adapter covers 61 Scannex embedded SCORM activities. EA uses its existing
review acknowledgement and native persistence state before enabling Next; quiz,
case and first-brief requirements stay under its authored engine. VPSHR and other
non-SCORM presentations use the same frame wrapper; plain teaching slides and
e-book reading controls do not acquire invented summary or quiz requirements.

The shared wrappers are used in normal and immersive/presentation displays on
APGI and partner deployments. Locked native Next and course-shell forward
controls give a specific next-action instruction. Back, revisiting unlocked
content, media, captions, image enlargement and accessibility controls remain
available. A navigation save failure stays visible with Retry saving.

## Progress and access

`training_sequence_progress` is additive and server-only: RLS is enabled and
browser roles have no direct grants. The authenticated API rechecks course
entitlement, the pinned edition, unit ownership and earlier Tiger eligibility.
Writes reject cross-origin requests and derive user/course/edition/unit from
the verified server context. The merge serialises an activity's writes, rejects
skipped steps and never lets an earlier retry erase a later step or summary.

Existing SCORM suspend data, answers, attempt counts, video ranges, summaries,
qualifications, certificates and review history are not rewritten. Existing
completed SCORM units and valid Tiger summary evidence unlock their completed
activities without fabricated historical step events. Preview evidence remains
in the preview scope and does not write learner records. Original video and quiz
thresholds are unchanged. There is no trigger that awards course completion from
this new table. Live payments remain disabled.

## Future authored activities and exports

The adapter recognises the existing Tiger/Scannex authored activity contracts.
Future activities should explicitly provide a Begin element marked
`data-learning-begin`, section controls numbered `data-learning-step="0"`,
`data-learning-step="1"`, etc., a `data-learning-summary` control and a summary
panel marked `data-learning-summary-panel`. Values must be consecutive integers
starting at zero. The panel must be hidden until opened. Unrelated controls
should not carry these markers. Activity identity includes the course document,
profile and step count, while server storage adds learner, course edition and unit.

The platform wrapper supplies enforcement, so re-exporting an activity that
retains its contract retains these controls without patching proprietary iSpring
files. New player contracts need explicit integration and regression checks;
arbitrary external-origin content cannot supply trusted completion evidence.
Direct static package use outside the authenticated learning wrapper is not
represented as the platform's saved learning experience.

## Verification

- Browser fixture exercises actual delivered HTML: ordered locks, Summary,
  saved navigation evidence and resume for all 89 Tiger/Scannex activities.
- API tests cover sign-in, entitlement, unit/edition binding, cross-origin writes,
  malformed/foreign activity records and save failures.
- Transactional database QA checks ordering, monotonic retries, edition isolation,
  RLS and restricted grants, then rolls back its synthetic rows.
- A common release must build and verify on both registered deployments before
  promotion; course media archives, publication and existing learner evidence are
  preserved. Independent course-content approval is not inferred from this repair.

See the [requirements](../modules/ALP/02-frs/addenda/20261120-sequential-learning-controls-requirements.md)
for the original acceptance criteria.
