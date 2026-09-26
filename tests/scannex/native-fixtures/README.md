# Native Scannex calibration exports

These two files are **unaltered TrainingTool exports**, produced locally on 26 September 2026. They are genuine application output from a technical calibration exercise, not learner records or operational answer keys. The native identity was `TestName / TestID`, the Viewer station was 9, the exercise was `APGI-CAL-20260926`, and its only image was database image 12 (a copy of the supplied SMPTE calibration TIFF).

The reviewer marked one reference target at the word TEST. In the first run no target was marked: the native Viewer dialog and TrainingTool table both reported right 0 / wrong 0 / missed 1. In the second run one matching marker and one deliberately incorrect marker produced right 1 / wrong 1 / missed 0 in both applications. Save Results generated these tab-separated files with CRLF endings.

| File | SHA-256 |
| --- | --- |
| calibration-missed.txt | `38526d5ff6fc34ec17148041ec08dcfab86301771b3e56994c21174fb700c248` |
| calibration-mixed.txt | `49b98e84e3cd638fb0cc65b1162cc53846f4b1d8371d48f09979078f430d9551` |

The format has no exercise ID, attempt ID, date, time, image hash or movement data. It contains the logged-on native identity, **not** the numeric Viewer station ID. Identity checks and byte hashes alone do not establish provenance or prevent a forged export. A protected collector must bind these fields to the APGI attempt and capture original bytes itself.

The parser intentionally accepts only the observed single-image, single-viewer ASCII format. Multiple images/viewers and other character encodings need genuine samples before support. Detection totals must agree with image counts, and right + missed must equal the expected reference-target count.

TrainingTool automatically exposed the correct annotation on Release, including behind the result dialog. No Movement Log file appeared in `C:\ScannexDB` after either run. The scan metadata log in `C:\ScannexLogs` remained unchanged. This is a detection-count parser only; it is not a validated collector, movement parser or scoring adapter and is not connected to the live evidence endpoint.
