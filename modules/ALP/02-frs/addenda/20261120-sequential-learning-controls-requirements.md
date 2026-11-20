# Next-version requirements: sequential learning controls

| Field | Value |
|---|---|
| Requirement group | FRS-ALP-SEQ |
| Recorded | 20 November 2026, SAST |
| Status | Requested for the next platform version; implementation and release verification pending |
| Scope | All training on APGI and every partner platform, including existing and future courses |
| Parent | [ALP functional requirements](../functional-requirements.md) |

## User direction and observed problem

During the live Tiger LU1 learner test, selecting Next before opening the slide 6
activity summary returned the learner to the same slide and restarted the activity.
Opening the summary allowed normal advancement to slide 7. The user requested
sequentially enabled buttons for the next version, then explicitly extended the
scope from Tiger to all training on APGI and partner platforms.

This is a platform-wide interaction requirement. Tiger is the initial regression
example, not a restriction on the courses covered. Record this for the next
platform release; this document does not claim that it is already implemented.

## Functional requirements

- **FRS-ALP-SEQ-001 — Explicit activity order.** Each course activity defines its
  required steps, their order and its completion/exit condition. Required action
  buttons unlock only after their preceding required step has been activated or
  completed according to that activity's existing rules. Do not infer order from
  visual layout or apply one activity's sequence to unrelated controls.
- **FRS-ALP-SEQ-002 — Activity entry and exploration.** Where an activity uses
  Begin, ordered sections and Summary, enable Begin first, then the required
  sections in order. Keep Summary disabled until the required sections have been
  visited. Already unlocked sections remain available for revisiting.
- **FRS-ALP-SEQ-003 — Forward navigation.** Keep the relevant Next/Continue
  controls disabled until the current activity's required steps and summary are
  completed and their required completion evidence is saved. Reflect the same
  state in embedded players, the course shell and presentation/full-screen modes.
  A premature navigation attempt must not restart the current activity or discard
  its state.
- **FRS-ALP-SEQ-004 — Clear guidance.** Display the specific next action beside
  locked controls, for example "Select stage 2 to continue", "Open the activity
  summary to continue" or "Saving your progress". Show save failures and provide
  a retry; never present failed persistence as successful completion. Guidance
  must also be available without hovering, including on touch devices.
- **FRS-ALP-SEQ-005 — Review and accessibility.** Preserve backward navigation and
  access to previously unlocked/completed steps. Do not sequence-lock unrelated
  controls such as volume, captions, zoom, resources or accessibility settings.
  Support keyboard operation, visible focus and accessible disabled states and
  instructions. A blocked Next must not create a keyboard trap.
- **FRS-ALP-SEQ-006 — Completion safeguards.** Button activation is evidence of
  interaction, not automatically a quiz pass, qualification or certificate.
  Preserve configured video thresholds, required summaries, assessment results
  and server-side completion checks. Existing Tiger 80% video and quiz rules
  remain unchanged. Preserve other courses' own configured rules; do not impose
  Tiger thresholds on them. Do not add a narration-completion requirement merely
  because the buttons are now sequenced.
- **FRS-ALP-SEQ-007 — Existing learner continuity.** Preserve enrolments, resume
  points, viewing evidence, saved summaries, quiz attempts/results, qualifications
  and issued certificates. Resume using the learner's saved unlocked/completed
  state. Existing valid activity completion evidence remains valid: introducing
  finer-grained step tracking must not force previously completed activities or
  courses to be repeated, fabricate earlier per-step events, or rewrite history.
  Any additional state must be additive, scoped to the learner/course edition/
  activity, and checked for backward compatibility before release.
- **FRS-ALP-SEQ-008 — Shared platform behavior.** Implement the common sequencing
  behavior once and release it consistently to APGI and registered partner
  platforms. Preserve tenant isolation, branding, course ownership and existing
  course assignments. New partners and courses inherit the same behavior.
- **FRS-ALP-SEQ-009 — Player and authoring coverage.** Include native activities,
  embedded HTML activities, iSpring/SCORM exports and any other supported training
  player. Inventory each integration and its supported completion events. Supply
  explicit step/completion mappings and authoring guidance where package changes
  are required; do not silently omit a course or advertise universal enforcement
  before those integrations are verified. Future exports must retain the sequence.
- **FRS-ALP-SEQ-010 — Release boundaries.** Keep live payments disabled throughout
  implementation and verification. Preserve review history, approvals and current
  publication state. Recording this requirement does not publish a new course,
  approve training, alter prices, send invitations or enable payments.

## Acceptance checks for the next version

| Check | Required evidence |
|---|---|
| Fresh activity | Only the first required action is enabled; later steps unlock in the authored order. |
| Summary and Next | Summary stays disabled until required exploration is complete; Next stays disabled until summary evidence is saved. |
| Premature navigation | Mouse, keyboard, outline/direct jumps and shell controls cannot skip required work or restart the current activity. |
| Existing completion | A learner with valid saved completion retains it and can revisit earlier steps without repeating passed work. |
| Interrupted session | Reload/resume restores saved state; retries after a failed save do not duplicate completion or claim a pass. |
| Backward navigation | Back and already unlocked steps remain available; accessibility and resource controls remain usable. |
| Thresholds and certificates | Existing video/quiz requirements remain enforced; navigation alone cannot issue a certificate. |
| Platform coverage | Verify APGI and partner learner views in normal and presentation modes, with each supported player integration represented. |
| Course coverage | Inventory all existing courses and test their activity types; include Tiger LU1 slide 6 and all other Tiger activities as regressions. |
| Authoring continuity | Re-export a representative authored package and confirm the sequence still works. |
| Preservation and payments | Compare retained learner/review/certificate evidence before/after; verify live payments remain disabled on every release target. |

Implementation, integration inventory, migration design if needed, automated tests,
live learner verification and human release acceptance remain outstanding. This
requirements-only update changes no runtime behavior or learner records.
