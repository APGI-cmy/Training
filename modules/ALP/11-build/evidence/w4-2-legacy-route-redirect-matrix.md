# W4.2 Legacy Route Inventory and Redirect Matrix

**Status:** Build evidence draft for PR review  
**Rule:** Retain or redirect every known legacy route before removal.

| Legacy route | Current purpose | Retain or redirect | Target / decision | Proof required |
|---|---|---|---|---|
| `/courses` | Public course listing | Retain | Existing public catalogue | Link and browser smoke proof |
| `/courses/vpshr-level-0` | Public VPSHR Level 0 information | Retain | Existing public course page | Public access proof |
| `/learn/vpshr-level-0` | Governed VPSHR Level 0 route | Retain | Existing enrolment-gated route | Enrolled/pending/revoked proof |
| `/learn/vpshr-level-0/units/introduction` | Governed first unit | Retain | Existing enrolment-gated unit | Enrolled/pending/revoked proof |
| `/catalogue` | New signed-in catalogue | Retain | Canonical learner catalogue | Learner-state proof |
| `/courses/scannex-training-programme` | Public Scannex programme information | Retain | Public Scannex course route | Public access proof when content is published |
| `/learn/scannex-training-programme` | Governed Scannex course route | Retain | Enrolment-gated route | Denial until course content is ready |

No route is deleted by this build slice. Any future removal requires a tested redirect and external-link impact review.
