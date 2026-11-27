import { REGION_LABELS, REGIONS } from "@/lib/assessments/scannex-assignment";

const DEMONSTRATE = [
  "Check that the assigned preloaded image is open. Start the recording before touching the Viewer controls.",
  "Examine the image in F1, F2, F3 and F4. Adjust each view before judging detail. Zoom in on candidates where needed.",
  `Scan bottom to top: ${REGIONS.map(r => REGION_LABELS[r]).join(" → ")}. Note the elapsed time when you finish each region.`,
  "Mark each candidate in the Viewer and enter a native comment. Note its annotation number and where it appears.",
  "Rule out obvious lookalikes with a reason. Keep the annotation and reason in your report. Apply the full checklist to anything retained or uncertain.",
  "Check whether an anomaly is present, whether it has a defined structure, and whether the edges are defined in F1–F4.",
  "Check density spread and density in F1/F2. Compare with bone and record the emboss observation and position. Even spread is a qualifying observation, not proof of a diamond.",
  "Choose Hold, Release or Review for the exercise and explain why. If the view or finding is unresolved, choose Review.",
  "Stop and save the clip. Save a Viewer screenshot, with annotations if there are any. Complete the electronic worksheet and save before moving on.",
] as const;

const ORDERED_DEMONSTRATE = [
  "Confirm the assigned image and start recording only the Viewer tab. In the Edge pilot, play a short practice clip first and verify it contains only the Viewer.",
  "Zoom out for orientation and use Auto Pan to scan the whole image from feet to head. Use Space / Shift+Space for Auto Pan; confirm direction and check every region.",
  "Annotate obvious lookalikes and add a native comment explaining the visible evidence that rules each one out (for example, a key with cut teeth and a ring). Brightness or edge shape alone does not prove what a material is.",
  "Flag and annotate anything you cannot explain. Only now use F1–F4, adjust the view and zoom to investigate that finding yourself.",
  "Once you locate a flagged anomaly, centre it and show it at each Viewer zoom level: ¼×, ½×, 1×, 2× and 4×. Re-centre it when needed.",
  "For each flagged finding compare structure and edges in all four modes, density and spread in F1/F2, bone and emboss comparisons, and position. Mark uncertainty instead of guessing.",
  "Complete the detailed checklist only for flagged findings. Use the paper or electronic version; write the image reference and annotation number on each paper checklist before attaching it to that exercise.",
  "Show your annotations and comments. Finish with Hold if uncertainty remains; Release only if all findings are ruled out. Stop and save the recording; do not upload the clip again.",
] as const;

export function PrintChecklistButton() {
  function printChecklist() {
    const body = document.body;
    body.dataset.paPrint = "checklist";
    const reset = () => { delete body.dataset.paPrint; };
    window.addEventListener("afterprint", reset, { once: true });
    try { window.print(); } catch (e) { reset(); throw e; }
  }
  return <button type="button" className="secondary-button" onClick={printChecklist}>Print the learner checklist</button>;
}

export function PracticalChecklist({ recordingFirst = false, orderedReview = false, guidedDeclaration = false }: { recordingFirst?: boolean; orderedReview?: boolean; guidedDeclaration?: boolean } = {}) {
  const instructions = guidedDeclaration ? [
    "Confirm the assigned image. For Exercises 2 and 3, make and play one practice clip first. Then start the live recording before you scan.",
    ...ORDERED_DEMONSTRATE.slice(1, 6), ORDERED_DEMONSTRATE[7],
    "In the worksheet, declare Hold or Release and explain why. For Hold, select the body area and complete the electronic checklist. Save before moving on.",
  ] : orderedReview ? ORDERED_DEMONSTRATE : recordingFirst ? [...DEMONSTRATE.slice(0, -1),
    "Leave any annotation and comment visible for a few seconds. Select Stop & save recording, wait for confirmation, then continue with the worksheet. No screenshot is needed."] : DEMONSTRATE;
  return <article className="pa-checklist-print">
    <h1>Scannex practical learner checklist</h1>
    <p>Print this as a desk guide and tick each column as you work. Record the evidence and reasons in the online worksheet. This printout is not a submission or a score.</p>
    <table>
      <thead><tr><th scope="col">What to demonstrate</th>{[1, 2, 3].map(n => <th key={n} scope="col">Exercise {n}</th>)}</tr></thead>
      <tbody>{instructions.map(line => <tr key={line}><th scope="row">{line}</th>{[1, 2, 3].map(n => <td key={n}><span className="pa-print-square" aria-hidden="true" /></td>)}</tr>)}</tbody>
    </table>
    <p>Before recording: finish sign-in, hide unrelated information and select only the assessment Viewer or the clean display dedicated to it. Do not record passwords, email, other people or audio.</p>
  </article>;
}
