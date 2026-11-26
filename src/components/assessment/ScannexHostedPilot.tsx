"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { privateIrelandViewerUrl } from "@/lib/assessments/scannex-hosted-pilot";
import { PracticalAssignment } from "./PracticalAssignment";
import { openScannexPilotTransport } from "./scannex-pilot-transport";

const GUIDE = "/scannex-v1-pilot/scannex-practical-recording-guide-illustrated.pdf";
const CHECKLIST = "/scannex-v1-pilot/scannex-viewers-checklist.pdf";

export function ScannexHostedPilot() {
  const [pilot] = useState(openScannexPilotTransport);
  const [viewerPath, setViewerPath] = useState<"new" | "already-open" | null>(null);
  const connected = viewerPath !== null;
  const [edge, setEdge] = useState(false);
  const [message, setMessage] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  useEffect(() => {
    setEdge(/\bEdg\//.test(navigator.userAgent));
    return () => pilot.clearEvidence();
  }, [pilot]);

  function launch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edge || !field.current) return;
    const target = privateIrelandViewerUrl(field.current.value);
    field.current.value = "";
    if (!target) { setMessage("Use a fresh private Ireland streaming link for the development builder."); return; }
    const tab = window.open("", "_blank");
    if (!tab) { setMessage("Allow the worksheet to open a new tab and ask APGI for a fresh connection."); return; }
    tab.opener = null;
    tab.location.replace(target.href);
    setViewerPath("new");
    setMessage("");
  }

  const instructions = <section className="pa-card" aria-label="Private Image 78 connection">
    <h3>Open the Scannex Viewer</h3>
    <p>Use the private development Viewer in standalone Edge. Sign in there before recording and share only the Viewer tab.</p>
    <p><a href={GUIDE} download>Download the illustrated recording guide (PDF)</a></p>
    {connected ? <p role="status">{viewerPath === "new" ? "The development Viewer opened in another tab." : "Continue with your existing development Viewer tab."} Verify Image 78 is visible there before confirming below.</p> :
      !edge ? <p role="status">Open this preview in standalone Microsoft Edge to continue.</p> : <><form method="post" autoComplete="off" onSubmit={launch}>
        <label htmlFor={fieldId}>Private Viewer connection from APGI</label>
        <input id={fieldId} type="password" ref={field} required autoComplete="off" spellCheck={false} maxLength={20_000} />
        <button type="submit" className="primary-button">Open Scannex Viewer</button>
      </form>
      <details><summary>Viewer already open?</summary>
        <p>If the private development Viewer is open in Edge and already shows Image 78, keep it open. Do not use the learner practice Viewer.</p>
        <button type="button" className="secondary-button" onClick={() => { if (field.current) field.current.value = ""; setViewerPath("already-open"); setMessage(""); }}>Use the open development Viewer</button>
      </details></>}
    {message && <p role="alert">{message}</p>}
    {connected && <details><summary>If Review or Load Image is greyed out</summary>
      <p>On the private AWS development desktop, open File Explorer and run <code>C:\scannex\APGI-Scannex-Pilot-Launcher.exe</code>. The Viewer-only desktop shortcut does not prepare the station.</p>
      <p>At READY, choose Review (R/W) and finish sign-in before recording. Use Load Image to open <code>C:\scannex\Viewer Training Images\F000000078.Tiff</code>. It is already on the development desktop; do not upload a file.</p>
    </details>}
  </section>;

  return <>
    <p className="pa-notice"><strong>Private V1 preview · ungraded Image 78 only.</strong> Nothing in this pilot is uploaded or changes your learner record. Keep this worksheet tab open; save a private copy before closing if you need to keep the clip.</p>
    <PracticalAssignment pilotTransport={pilot} previewViewerAccess={{
      overview: <p>Start with the checklist, then open the development Viewer from the <strong>Connect &amp; confirm</strong> step.</p>,
      connect: instructions, sessionStatus: null, canConfirm: connected, orderedReview: true, tabOnly: true,
      guideHref: GUIDE, checklistHref: CHECKLIST,
    }} />
  </>;
}
