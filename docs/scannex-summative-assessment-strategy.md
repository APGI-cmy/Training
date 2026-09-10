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

## Summative assessment design

The final assessment will have two connected parts.

### Part A: browser-based Scannex decision simulation

This is built directly in the APGI Training Platform, not as an iSpring Web Object.

The simulation will use approved training images and a realistic, clearly labelled training interface. It will require the learner to:

- identify a potential anomaly;
- choose appropriate viewing controls in a defensible order;
- consider normal anatomy and image context;
- make a hold, release or escalation decision;
- record the required outcome.

The platform records the learner's choices, sequence, timestamps and result against their account.

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

1. The platform assigns the summative assessment and gives the learner a unique assessment reference.
2. The learner completes the browser simulation. The platform stores the outcome.
3. The assessor starts the corresponding Trainer exercise at an authorised Scannex training station.
4. The Trainer result is saved by the assessor.
5. The assessor uploads the approved result evidence to the learner's assessment record, or enters the result into the platform where file upload is not appropriate.
6. The assessor reviews the Movement Log and completes the rubric.
7. The platform records the assessor's pass, remediation or re-attempt decision.
8. Only a passed browser simulation, passed live exercise and completed assessor review make the learner eligible for final course completion.

The platform must not automatically award competency merely because a learner has opened the Trainer or uploaded an unverified file.

## Initial marking rubric

The approved rubric must be finalised before the first formal assessment. It should separately score:

1. **Viewing discipline** - methodical examination and purposeful use of the available viewing tools.
2. **Image interpretation** - distinguishes a credible anomaly from normal anatomy or an expected image feature.
3. **Object detection** - correct, wrong and missed annotations from the Trainer result.
4. **Operational decision** - appropriate hold, release or escalation action.
5. **Recordkeeping and communication** - appropriate comment, explanation and escalation record.
6. **Safety and role boundaries** - follows the approved process and does not attempt unauthorised technical adjustment.

A material safety breach, such as an unsafe release or clear failure to escalate, should be a mandatory review item rather than being hidden by an average score.

## Technical boundaries and guardrails

- The legacy Scannex ADS Trainer is a Windows application connected to IVServer. It cannot be embedded in an iSpring or browser page.
- Vercel hosts the APGI Training Platform. It is not a substitute for the local Scannex Trainer environment.
- Render may provide a separate AI-support service where justified. It must not directly operate the Trainer or make the final credentialing decision.
- Any automation of Trainer-result transfer is a later integration phase. It starts only after the saved result format, local network permissions, data ownership and security controls are confirmed.
- Training images, result files and Movement Logs must be handled as controlled assessment evidence. Only approved, appropriately anonymised training material may be used in browser simulations or uploaded to the platform.
- The browser simulation must identify itself as a training simulation and must never be described as a production operational control system.

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
