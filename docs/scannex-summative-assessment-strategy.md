# Scannex Summative Assessment Strategy

## Decision record

**Decision:** APGI Training Platform will become the learner, evidence, assessment and completion system for Scannex training. iSpring remains the authoring and publishing tool for Learning Units (LUs). The Scannex ADS Trainer remains the controlled, live practical assessment environment.

This avoids trying to force a Windows desktop application into a browser while retaining its strongest features: real training images, annotation assessment, right/wrong/missed-object results, and Movement Log review.

## The target model

| Layer | Accountable purpose |
| --- | --- |
| iSpring | Author LUs, interactions, formative quizzes, narration and short learning simulations. |
| APGI Training Platform | Authenticate learners, provide course access, embed published iSpring material, record progress, collect evidence, manage assessment and reviewer decisions, and determine final completion. |
| Scannex ADS Trainer | Deliver the supervised practical exercise with real training images and record object-detection performance. |
| Assessor | Review Trainer results and Movement Log evidence using an approved marking rubric. |
| AI support, if approved for a later phase | Assist the assessor with structured evidence review; it must not make the final certification decision on its own. |

## Immediate work: publish the current LUs

The current priority is to publish the completed Scannex LUs to the APGI Training Platform.

1. Publish each iSpring Learning Unit as the approved course content.
2. Add the published output to the matching platform unit.
3. Confirm that each unit loads, works at normal learner screen sizes, and retains its intended navigation and quiz behaviour.
4. Use the platform as the launch point for all new learners, even while enrolment and invitation work is being completed separately.
5. Treat the existing formative quizzes as learning checks. They support progress and remediation; they are not the final practical competency decision.

No redesign of a working iSpring interaction is required solely because this strategy exists.

## Approved summative scoring model

The approved first-release standard is based on the practical-assessment memorandum:

- **Theory knowledge assessment:** 68 marks.
- **Supervised Scannex practical:** 32 marks, calculated from the assessor's 100-point practical instrument as `rubric score / 100 × 32`.
- **Final result:** 100 marks in total, with a **75% overall pass requirement**.

The platform stores the theory score, detailed practical score, converted practical mark, final score, saved Scannex result reference, Viewer Movement Log reference and assessor checklist reference. A final pass remains an assessor decision. It cannot be recorded until the three controlled evidence references and both component scores are present.

## Summative assessment design

The final assessment will have two connected parts.

### Part A: browser-based Scannex knowledge assessment

This is built directly in the APGI Training Platform, not as an iSpring Web Object. The initial release uses the selected 68-mark questions from the approved Scannex summative memorandum. Correct answers and submitted selections remain server-side assessment evidence.

The assessment requires the learner to demonstrate knowledge of:

- Scannex purpose, benefits, layout and integrated systems;
- x-ray technology, radiation and exclusion criteria;
- pre-identified contraband and body-search principles;
- Viewer functions, anomaly characteristics and anatomy.

The platform records the learner's submitted choices, timestamp and score against their learner account. A later decision-simulation extension may use approved training images, but it will remain clearly labelled as training and never as the production Viewer.

This simulation assesses decision-making and application of the learning programme. It does not claim to be the production Scannex system.

### Part B: supervised Scannex ADS Trainer exercise

A learner completes a controlled exercise in the Scannex ADS Trainer.

The exercise is created from approved Training/Test images already loaded in the Scannex image database. Images are served in the selected order. The learner annotates objects of concern and releases each image when satisfied.

The Trainer is the source of evidence for:

- right annotations;
- wrong annotations;
- missed objects;
- completion of the exercise.

The assessor reviews the Viewer Movement Log to evaluate whether the learner used the viewing process competently, rather than judging detection alone.

## Evidence flow

1. The learner completes the browser-based knowledge assessment. The platform stores the 68-mark outcome.
2. The assessor creates and approves the practical booking, which generates the unique assessment reference and links the latest knowledge result.
3. The assessor starts the corresponding Trainer exercise at an authorised Scannex training station.
4. The Trainer result is saved by the assessor.
5. The assessor records the saved Scannex result, Viewer Movement Log and assessor checklist against the assessment reference.
6. The assessor records the 100-point practical-rubric result. The platform converts it to the 32-mark practical component and calculates the score out of 100.
7. The platform permits a pass only when all evidence is present and the calculated score is at least 75. The assessor records the final decision, remediation or re-attempt.
8. Only the assessor-approved final decision makes the learner eligible for final course completion.

The platform must not automatically award competency merely because a learner has opened the Trainer or uploaded an unverified file.

## Initial marking rubric

The platform now records the controlled assessor instrument item by item. It covers:

1. **Use of the Scannex application** (20 raw marks) - viewing modes, invert, contrast and density, core application features, annotation and comments.
2. **Interrogation of images** (25 raw marks) - systematic scanning, viewer use, detection, annotation and distinguishing normal anatomy from a credible diamond anomaly.
3. **Use of the Scannex checklist** (54 raw marks) - checklist application, diamond characteristics, density check, accurate records, conclusion, detection, required actions and sign-off.

The source instrument totals **99 raw marks** (20 + 25 + 54). The platform keeps that source score and normalises it to 100 before calculating the agreed 32 practical marks. The existing worksheet's `Recordable Mark` formula (`total / 9`) does not match its displayed maximum of 10, so the platform does not use that formula. This should be formally ratified before the first certification cohort.

A material safety or role-boundary concern is recorded separately and blocks a pass decision until it has been reviewed. It cannot be hidden by a high average score.

## Technical boundaries and guardrails

- The legacy Scannex ADS Trainer is a Windows application connected to IVServer. It cannot be embedded in an iSpring or browser page.
- Vercel hosts the APGI Training Platform. It is not a substitute for the local Scannex Trainer environment.
- Render may provide a separate AI-support service where justified. It must not directly operate the Trainer or make the final credentialing decision.
- Any automation of Trainer-result transfer is a later integration phase. It starts only after the saved result format, local network permissions, data ownership and security controls are confirmed.
- Training images, result files and Movement Logs must be handled as controlled assessment evidence. Only approved, appropriately anonymised training material may be used in browser simulations or uploaded to the platform.
- The browser simulation must identify itself as a training simulation and must never be described as a production operational control system.

## Immediate delivery route: supervised training station

The current approved route is a **supervised practical exercise at an APGI-approved Scannex training station**. The Scannex Viewer and Trainer remain on the controlled Windows workstation where they already operate correctly.

The APGI Training Platform provides the assessment entry point, instructions, learner identity, evidence record and final outcome. It does not pretend that an ordinary browser page is the native Viewer.

### Operating process

1. The learner completes the required learning units and formative remediation.
2. The assessment lead assigns a case set and schedules the supervised station session.
3. The learner completes the assigned Trainer exercise in the genuine Viewer.
4. The assessor saves the approved Trainer result and Viewer Movement Log using the assessment reference.
5. The assessor records the rubric outcome, remediation or re-attempt in the APGI Training Platform.
6. Only the assessor's approved final decision completes the programme.

This is the correct first pilot because it validates the exercises, evidence and rubric before remote access or automation is considered.

## Approved practice option: hosted Windows Viewer Lab

APGI has confirmed that the trainer version may be used for the e-learning programme and hosted off site. AWS WorkSpaces Applications is therefore the selected environment for an initial learner practice lab. Compatibility has already been proven on the stopped `apgi-scannex-dev-builder` in `eu-west-1`.

The Viewer is launched from the LU 6 Web Object and APGI Training Platform, then opened in a separate secure streaming window. The separate window preserves the genuine Windows application, supports a second-screen workflow and avoids presenting a browser imitation as the Viewer.

### Hosted practice-session architecture

| Component | Responsibility |
| --- | --- |
| APGI Training Platform | Confirms learner identity and active Scannex enrolment, then creates the short-lived practice-session hand-off. |
| AWS WorkSpaces Applications | Provides the managed remote Windows application session and publishes only the approved Viewer application. |
| Windows session host | Contains only the approved Scannex Viewer, supporting Trainer/IVServer components and approved non-assessment practice material. |
| Scannex Viewer/Trainer | Provides the genuine controls and image-viewing behaviour used for LU 6 practice. |
| Formal assessment release | Adds approved exercises, evidence and assessor decisions later, after the outstanding assessment rules are agreed. |

The platform must never transmit a Windows administrator credential, a shared Viewer password or a learner identity in a browser query string. The platform uses the learner's existing session and active course enrolment, then creates a short-lived AWS streaming address on the server. Vercel assumes a narrowly scoped AWS role through OIDC, without stored access keys.

### Windows host controls

- Use the dedicated WorkSpaces Applications image, fleet, stack, VPC and security group for the practice environment.
- Publish only the required Viewer application as a RemoteApp. Do not offer an unrestricted desktop.
- Build the host image from a supported Windows image, then install the licensed Scannex Viewer, Training Tool and required IVServer components.
- Restrict clipboard, drive, printer and file-transfer redirection unless a documented assessment reason requires a specific exception.
- Use a non-persistent or reset-on-logoff session configuration so one learner cannot see another learner's material or history.
- Keep the training-image set, answer key, result files and Movement Logs in the controlled assessment environment. Only approved, anonymised training material may be used.
- Send diagnostic, sign-in and session events to the approved audit location. A Viewer Movement Log remains the authoritative record of Viewer use.

### What a later hosted launch does and does not do

The first deployed version will open the Viewer Lab in a separate secure window. This preserves native Viewer operation and avoids presenting a browser imitation as the real tool.

It will not yet automatically score individual toolbar clicks. The first practical score is based on the approved Trainer result and assessor review of the Movement Log. Automated collection can be considered only after a pilot confirms that the native application exposes sufficient reliable evidence and that its licence permits the integration.

### Provisioning sequence

1. Start the existing AWS image builder and create `apgi-scannex-practice-v1` with IVServer and the Viewer configured for training practice.
2. Publish only `ScannexViewer` and verify that IVServer starts before the application.
3. Create the `apgi-scannex-practice` one-user fleet and stack, initially using `stream.standard.medium`.
4. Configure the Vercel OIDC identity provider and the least-privilege `apgi-scannex-viewer-lab-launcher` role with only `appstream:CreateStreamingURL` access to that fleet and stack.
5. Add the server-only Viewer Lab settings to the Vercel production environment.
6. Run the one-user practice pilot and confirm controls, second-screen use, session isolation, shutdown and cost.
7. Release the practice lab to enrolled learners after the pilot passes.

### Required decisions before formal assessment hosting

- The named assessment lead, approved image set, answer key, pass standard and remediation rules.

### Future image upload service

The image-upload service is a separate next step. It will be an assessor-only controlled repository with scenario metadata, approval status and audit history. It will not be a general learner file browser and will not expose raw training images to a learner before the assigned exercise begins.

## Phased delivery

### Phase 1 - now: course availability

- Publish the completed iSpring LUs on the APGI Training Platform.
- Verify learner access and course navigation.
- Continue the learner-invitation and bulk-enrolment completion work in its separate stream.

### Phase 2 - assessment foundation

- Finalise the live Trainer exercise set and answer key.
- Finalise the assessor rubric, pass standard and remediation pathway.
- Run a small supervised proof exercise to confirm the saved Trainer results and Movement Log provide the expected evidence.
- Add an assessment record and assessor workflow to the platform.

### Phase 3 - browser simulation

- Build the platform-native Scannex decision simulation.
- Record learner decisions and sequence.
- Test it against the rubric and a small set of representative training cases.

### Phase 4 - controlled rollout

- Pilot with a small group and an assessor.
- Compare platform records, Trainer results and assessor judgement.
- Correct any evidence, access or usability gaps before wider learner release.

### Phase 5 - optional automation

Only after a successful pilot, investigate a controlled way to import or upload Trainer results into the platform. This may be a structured result upload or a local assessment-station helper. It must preserve assessor review and auditability.

## Completion definition

A learner has successfully completed the Scannex programme only when all of the following are true:

- required LUs are completed;
- formative remediation requirements, where applicable, are satisfied;
- the platform decision simulation is passed;
- the live Scannex Trainer exercise meets the approved standard;
- an authorised assessor has reviewed the evidence and recorded the final decision.

## Ownership

- **Learning design:** iSpring learning content, formative checks and simulation scenario.
- **Platform delivery:** learner access, progress, assessment record, evidence storage and completion workflow.
- **Scannex assessment lead:** Trainer image selection, answer key, pass threshold and assessor calibration.
- **Assessor:** live exercise supervision, Movement Log review and final evidence-based decision.

## Next decision point

Once the current LUs are published, the next work item is to create the detailed summative assessment specification: the selected Trainer images, expected detections, required viewer actions, marking rubric, pass rules and remediation pathway.
