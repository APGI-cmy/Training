# Scannex in APGI Training: browser hosting proposal

**Prepared:** 24 September 2026  
**Status:** Proposal for a technical pilot. No cloud account, paid resources or live automated results have been created.

## Recommendation

Use **Amazon WorkSpaces Applications (formerly AppStream 2.0)** to stream the genuine Scannex Viewer into APGI Training. Keep the existing Vercel website and Supabase records. Begin with one isolated Windows session at a time and a **US$100 monthly planning budget** for a small pilot, after the native feasibility checks below. This is an estimate, not a guaranteed spending cap or a production quotation.

AWS explicitly supports embedding a streaming session in a website with educational instructions alongside it. That matches the intended learner experience. Scannex itself still runs on Windows; the browser displays and controls it. This does not require rebuilding or imitating Viewer. [AWS embedding documentation](https://docs.aws.amazon.com/appstream2/latest/developerguide/embed-streaming-sessions.html)

The user has changed the earlier station-only scope to browser access and unattended assessment. The objective is **no assessor involvement during each learner attempt**. Initial case approval, marking-rule calibration and software maintenance still need responsible human owners.

## What the learner will do

1. Sign in to APGI Training and open Scannex Unit 9.
2. Complete the existing 68-mark knowledge assessment.
3. Start the practical. The platform checks access, reserves a session and runs an automatic readiness check.
4. Read an instruction beside the embedded Viewer, perform the action in real Scannex, and complete the associated checklist or decision response.
5. Submit the practical. The system collects native evidence, validates its completeness and applies the approved 21-item marking rules.
6. Receive the practical mark, the combined score and permitted feedback. A technical interruption produces an incomplete attempt with a recovery route, never an invented result.

The practical contributes 32 course marks and theory contributes 68. The overall pass requirement stays 75/100, with the existing material-safety and evidence requirements translated into validated automatic checks before unattended release.

**Scoring reconciliation required:** the original workbook and the platform's 21 item maxima total **100** (20 + 25 + 55), but the handover and current normalisation denominator say **99**. This was detected during verification. Using all current maxima with that denominator produces 101.01/100 before weighting. The proposed correction is a denominator of 100, preserving all item allocations and the 32-mark practical weighting. User confirmation is pending; this proposal does not change the live calculation. Source: `Scannex practical assessment instrument.xlsx`, Sheet1, D9:D13, D17:D21 and D25:D37. The separate legacy recordable-mark formula in E38 (`E37/9`) is also inconsistent with its displayed maximum and is not a suitable replacement.

## Hosting design

| Component | Proposed responsibility |
| --- | --- |
| Existing APGI site on Vercel | Learner identity, enrolment checks, instructions, checklist, launch requests and results display. |
| WorkSpaces Applications in AWS Ireland | One Windows Server test image containing Viewer, IVServer, TrainingTool and an assessment integration service; single-session On-Demand fleet. |
| Windows integration service, to be built | Bind the native session to the assessment reference, launch the correct case set, collect result files and event evidence, and upload an authenticated evidence package. |
| Existing Supabase backend | Attempt ownership, case/rule versions, private evidence storage, scoring records and audit history. Scoring runs on the server. |

Start by evaluating `stream.standard.medium` (2 vCPU, 4 GiB) on Windows Server 2022. This is a costing baseline, not a proven Scannex specification. Increase it only if image handling and interaction tests show it is necessary, and revise the budget before provisioning a larger configuration. AWS supplies Windows Server images, but local Scannex operation on Windows 10 does not prove Server compatibility. [AWS image-builder operating systems](https://docs.aws.amazon.com/appstream2/latest/developerguide/managing-image-builders.html)

Ireland is a candidate region, not a confirmed latency choice. AWS's published service-endpoint list includes Ireland and London but does not list Cape Town for this service. Test actual connections from the intended learner locations before selecting the region. [AWS endpoints](https://docs.aws.amazon.com/general/latest/gr/aas2.html)

Only Viewer should be available to learners. TrainingTool configuration, answer keys, administrator functions and previous learners' evidence must be inaccessible. Each session starts from a clean case set; evidence must reach persistent storage before the session is destroyed. The required isolation must be demonstrated, including native file-open dialogs and Viewer database browsing.

The platform will issue short-lived launch links after checking the signed-in learner, enrolment and attempt. AWS recommends approximately five-second streaming URLs because valid iframe URLs can otherwise be copied. Stable learner identities should be used for the streaming service, with separate attempt IDs. Prevent duplicate sessions for the same learner. Hiding a toolbar alone is not an access control. [AWS embedding considerations](https://docs.aws.amazon.com/appstream2/latest/developerguide/embed-streaming-sessions-recommendations-considerations.html)

No additional Render service is required for this proposal. Keep the integration small until a measured need justifies another service.

## Devices and assessment quality

AWS supports current Chrome, Edge, Firefox and Safari browsers. Browser availability is only the first requirement: the practical must also preserve image detail, usable annotation controls and fair marking. Test laptop, desktop and tablet layouts, reconnect behaviour and slower connections. Phone use remains a target to validate; do not promise a fair high-detail image assessment on every screen before it has been tested. [AWS browser requirements](https://docs.aws.amazon.com/appstream2/latest/developerguide/web-browser-requirements-user.html)

Use a pre-assessment device and connection check. If a device cannot provide adequate image detail or control precision, explain that before starting a scored attempt. The system must distinguish connection failure from an incorrect learner action.

## Estimated pilot cost

Assumptions: Ireland, one concurrent session, 10 distinct learners per month, two billable session hours per learner, a 730-hour month, and 10 image-builder hours. Additional preparation, retry or support sessions can increase billable hours. The Windows user fee is charged for each distinct streaming user in that month.

| Cost | Calculation | USD/month |
| --- | --- | ---: |
| Active Windows fleet | 20 hours x $0.11 | $2.20 |
| Idle On-Demand capacity | 710 hours x $0.026 | $18.46 |
| Windows single-session user fees | 10 users x $4.19 | $41.90 |
| Image builder | 10 hours x $0.11 | $1.10 |
| Core subtotal | | **$63.66** |
| Conservative public IPv4 allowance | Up to 740 address-hours x $0.005 | $3.70 |
| Subtotal including address allowance | | **$67.36** |
| Planning allowance for evidence storage, logging and request handling | Estimate; measure during pilot | $10-$25 |
| Recommended rounded planning budget | One-seat, 10-learner pilot | **$100** |

The hourly Ireland rates were checked against the [AWS regional price file](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonAppStream/current/eu-west-1/index.json). Windows user fees, billing behaviour and public address charges are documented on the [AWS pricing page](https://aws.amazon.com/workspaces/applications/pricing/). The address allowance deliberately assumes more hours than active streaming; it is not a claim that every idle fleet hour necessarily uses a billed public address.

Excludes Scannex licensing, tax, development and calibration work, existing Vercel/Supabase subscriptions, paid support, and additional network services such as a NAT gateway if the final network design requires one. No free credits or educational licensing discount are assumed. A second continuously available seat adds idle capacity costs even if learner numbers do not increase; more distinct learners add Windows user fees. Recalculate before scaling.

Configure spend notifications and maximum fleet capacity before the pilot. Budget notifications are not a hard spending cutoff. Schedule idle capacity down when testing stops and stop the image builder after use. Do not terminate an active assessment merely to meet a notification threshold; preserve evidence and stop new launches instead.

## Native feasibility findings

| Verified or documented | Still unverified |
| --- | --- |
| Local genuine Viewer, IVServer and TrainingTool are available. Viewer 9 connects; it was logged off at the latest inspection. | Supported unattended learner logon, exercise launch and clean reset. |
| Pilot A currently references Image 11, labelled Pilot A - TWR1. | Approved targets, normal distractors, classification and operational conclusion. The five-case register has no approved entries. |
| The original Utilities manual describes right/wrong/missed results and a Save Results action. | A dependable automatic export, file format, attempt binding and authenticated upload. |
| The Viewer manual describes Movement Log playback. | A machine-readable event format sufficient to score correct use, sequence and coverage. |
| The original training procedure displays feedback and correct annotations after each image. | A supported assessment mode that keeps those answers unavailable during the attempt. |
| APGI has 21 rubric items and the 68/32 scoring model. | Approved automatic rules and partial-credit scales for all 21 items. Native detection totals alone are insufficient. |
| The source workbook's actual item maxima and the platform rows both total 100. | Confirmation to correct the existing denominator of 99. |

Manual sources: *Scannex ADS IVServer and Utility Programs User Manual 3*, document A17-100001-752 revision 1.2, TrainingTool section; and *Scannex ADS Viewer User Manual 1.5*, document A17-100000-752 revision 1.5, Movement Log section. Both are in the local `Classroom training set-up software/Scannex ADS/Documentation` folder. Their behaviour must be checked against the installed binaries.

No scoring or export API has been verified. The available IVSIF library exposes viewer/image-related operations, but inspection has not established an assessment-result interface. Obtain the supplier's supported SDK, export specification and hosted-use terms. A screen-driven launcher may be a fallback for operating the native application; screen clicks alone cannot establish competence or replace trustworthy scoring evidence.

## Delivery stages and acceptance criteria

**1. Prove native automation before paying for ongoing hosting.** Use clearly marked test records. Demonstrate launch, evidence capture and reset; verify that feedback and answer images can be suppressed. Obtain representative native results and logs, including failures. Confirm the supplier's hosting and unattended-use terms. If a required capability is unavailable, request a supported software change; report the gap rather than quietly substituting a browser simulator.

**2. Build the hosted technical pilot.** After the hosting approach and account are approved, create one test image and one single-session fleet. Prove embedded use, image fidelity, usable latency, learner isolation, reconnects and evidence persistence. Use approved anonymised training material only. An AWS account owner must supply account access through the normal provider sign-in or delegated role, not passwords in this task.

**3. Calibrate marking and implement the integration.** Resolve the 100-versus-99 discrepancy, then have a Scannex subject expert approve each case and the expected evidence for all 21 items, including partial credit and safety-critical failures. Build attempt records, session provisioning, evidence upload, server-side rules and the final result display. Preserve scoring precision and link the chosen theory attempt explicitly so that later retries cannot silently change a completed result.

**4. Validate unattended operation.** Run known-correct, known-incorrect, partial-credit, missed-object, false-positive, missing-log, duplicate-upload, timeout and interrupted-connection cases. Demonstrate that all 21 items have validated evidence, users cannot access other sessions or keys, and incomplete evidence cannot produce a pass. Compare outcomes with the approved reference marks before enabling real learner attempts.

No reliable delivery date can be set until stage 1 establishes what the installed Scannex version actually supports. The current development deliverable is the corrected Unit 9 administrator preview and a 21-item evidence/readiness map; it is not yet a hosted session or marking engine.

## Decisions needed to move beyond the proposal

- Accept or revise the AWS one-seat pilot direction and the US$100 monthly planning budget, subject to the native feasibility gate.
- Nominate the owner of the AWS account and the Scannex supplier contact for licence, SDK and assessment-mode questions.
- Nominate the subject expert who will approve cases and mark allocations before unattended learner use.
- Confirm a denominator of 100 to match the source item marks, or specify an approved one-mark reduction if the raw total must remain 99.

These decisions are separate from production release. No hosting purchase, paid resource or real learner assessment is authorised merely by this document being generated.

## Development verification and handover

Local changes correct the Scannex Unit 9 administrator preview, add draft learner instructions and add `/admin/assessments/automation` with the 21-item evidence map. They are not deployed. The knowledge preview uses the existing server-side function that omits correct-answer IDs. It does not start an attempt, submit a mark or write learner progress.

Verification completed on 24 September 2026:

- Production build and TypeScript checks passed; the existing media check verified 66 MP4 assets.
- Isolated rendering verified 22 knowledge questions without marking keys, all 21 practical instruction/evidence entries, and no submission form. Browser inspection confirmed question expansion and practical-instruction layout. This was a presentation check, not a complete authenticated learner attempt.
- Signed-out requests to the readiness page and both Unit 9 preview routes returned the application's sign-in redirect without the protected assessment content. Next.js streamed these redirects in the response body, so the HTTP 200 response alone was not treated as proof of access.
- All three proposal PDF pages were rendered and visually inspected.

The scoring discrepancy is pre-existing. A confirmed correction must cover the raw-score constant, versioned results, displayed denominators and the database constraint introduced by migration 014 (`raw_score <= 99`). Do not edit the already-applied migration or silently recalculate historical decisions. Use a new migration and an explicit policy for any existing scored records. No scoring function, database record, native exercise or learner result was changed during this proposal work.
