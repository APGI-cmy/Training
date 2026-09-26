# Scannex native validation — 26 September 2026

The local Windows Viewer and TrainingTool can run a controlled exercise and export accurate detection counts. This establishes a small part of the evidence chain. Fully automated summative delivery remains disabled because action capture, answer concealment, protected unattended collection and approved operational answer keys are not yet established.

## Test environment and scope

- Existing local Scannex installation and IVServer service; server monitor reported READY. AWS was not running for these tests.
- Viewer station 9; Viewer.exe and TrainingTool.exe file versions both report 1.0.0.1.
- The utility manual (A17-100001-752 revision 1.2, page 26) documents using DLLTest to move a connected Viewer to READY when the scanner controller is absent. This enabled local Review. Johan completed the supervisor authentication himself.
- Imported the supplied SMPTE calibration TIFF as new database image 12, label `APGI TECHNICAL TEST - Calibration 20260926`, type Training. The reference contained one marker on the word TEST.
- Created exercise `APGI-CAL-20260926`, description `Technical test only. One calibration marker on the word TEST. No learner marks.` It contains image 12 only. The pre-existing Pilot A exercise and image 11 were not changed.
- Native training identity: TestName / TestID. This is separate from numeric station ID 9.

## Observed results

| Test | Expected right / wrong / missed | Viewer result | TrainingTool result |
| --- | --- | --- | --- |
| Submit without an annotation | 0 / 0 / 1 | 0 / 0 / 1 | 0 / 0 / 1 |
| Submit one matching and one deliberately incorrect annotation | 1 / 1 / 0 | 1 / 1 / 0 | 1 / 1 / 0 |

Both exports were saved through TrainingTool's Save Results command. Unchanged copies and SHA-256 values are in [native-fixtures](../tests/scannex/native-fixtures/README.md). They support the new strict result parser and its 26 tests. They are not operational learner evidence.

During the second run, F2, F3 and F4 visibly selected the respective viewing modes; F6 was pressed and F1 restored normal view. The resulting export contains none of these actions. A key press alone is not proof of effective use or rubric competence, and these actions have not been converted into marks.

## Export limitations and blocking findings

1. **Immediate answer disclosure.** On the first Release, the Viewer replaced the learner annotations with the reference annotation and displayed a results dialog. The correct reference marker was already visible behind the dialog. A second Release ended the image. Suppression must prevent the annotation display itself, including during latency/reconnect; automatically clicking OK is not sufficient.
2. **Detection summary only.** The text export contains image ID, logged-on native name/ID, right/wrong/missed counts and totals. It has no exercise reference, APGI attempt, timestamps, image digest, marker coordinates, viewing modes, viewport movement or comments. The collector must establish trusted identity/time/exercise/image binding separately.
3. **No persisted movement evidence found for these runs.** After both tests, `C:\ScannexDB` contained only image 11 and image 12 `.ImageInfo`/`.Tiff` files. Image 12 metadata had not changed since reference annotation setup. The sole file in `C:\ScannexLogs` remained dated 17 September. The vendor manual describes this log as scan metadata, not Viewer actions. This does not prove movement capture is impossible; it means a usable training-session action export has not been located or validated.
4. **Overview is not an export specification.** The Viewer manual (A17-100000-752 revision 1.5, pages 10, 20 and 26) describes replaying Movement Logs and observing training viewers live. It does not document a machine-readable format or unattended export interface. The supplied IVSIF import library is not an API header or format specification.
5. **Calibration is not case approval.** A marker on TEST verifies detection behavior; it supplies no defensible answer key for the actual Scannex assessment images. The pilot case register still needs approved anomaly locations, interpretation, expected operational actions and scoring checks.
6. **Normal-mode experiment not completed.** After saving the second result, TrainingTool rejected Log Off with “Viewer 9 requires security tag logoff. Logoff from Training Tool not possible.” The message was acknowledged; no authentication/security settings were changed, and no normal-mode test image was created. Unattended login/logout needs a supported hosted-session design. Johan has no additional SDK documentation or support contact, but is willing to send a technical inquiry to the supplier.

The parser deliberately accepts only the observed single-image/single-viewer ASCII layout. It rejects additional rows/images, inconsistent totals, wrong identities, unexpected reference-target counts and unsupported encodings. It returns counts and the original-byte digest; it cannot create a final mark, movement facts or a validated adapter version.

## Questions for Scannex technical support

Prepared for Johan to raise with the supplier; no message has been sent.

- Is there a supported examination mode that suppresses **all** correct annotations and per-image results before the final assessment ends? Which version and configuration support it?
- Can training-session Viewer actions be persisted and exported without supervisor interaction? Please provide the API/SDK headers, export specification, version information and a sample export.
- Does that evidence include timestamps, image identity, pan/zoom/viewport, display mode, contrast/density/inversion, annotation coordinates, comments and Release/Hold? Which events are absent?
- Can an exercise be started, bound to an externally supplied attempt ID, completed and exported unattended, with retries and reconnect handling?
- If training mode does not retain Movement Logs, is there a supported normal-viewing assessment workflow with separate protected reference annotations and no answer disclosure?
- How should the Viewer, database, answer keys and collector be isolated for independent learner sessions on hosted Windows?

After resolving these points, validate all 21 rubric observations against known actions, implement the protected collector and run the complete APGI browser flow before enabling learners.

## Candidate workaround to investigate

Use ordinary Viewer sessions with separate learner image copies and keep the reference answers on the APGI server. A protected Windows companion process would collect native action/annotation records and submit signed evidence to APGI. This could avoid TrainingTool feedback **if** normal viewing records the required evidence and can be driven unattended. Neither condition is validated yet; the current software still depends on native session authentication.

A reliable implementation must match image hashes and coordinates, record gaps/disconnects, resist learner alteration and terminate at the approved expiry. A UI log of clicks or selected modes cannot establish correct image interpretation or effective use by itself. Any observation without validated capture must remain incomplete, never receive assumed marks. Rebuilding the Viewer in the browser would be a separate scope decision requiring functional equivalence and permission to use the proprietary components/assets; it is not the current implementation.
