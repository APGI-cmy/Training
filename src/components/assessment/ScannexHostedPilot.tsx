"use client";

import { useEffect, useRef, useState } from "react";
import { SCANNEX_PILOT_LAUNCH, privateIrelandViewerUrl } from "@/lib/assessments/scannex-hosted-pilot";
import { PracticalAssignment } from "./PracticalAssignment";
import { ScannexPilotViewerHelp } from "./ScannexPilotViewerHelp";
import { openScannexPilotTransport } from "./scannex-pilot-transport";

const GUIDE = "/scannex-v1-pilot/scannex-practical-recording-guide-illustrated.pdf";
const CHECKLIST = "/scannex-v1-pilot/scannex-viewers-checklist.pdf";

export function ScannexHostedPilot({ automaticLaunchConfigured }: { automaticLaunchConfigured: boolean }) {
  const [pilot] = useState(openScannexPilotTransport);
  const [viewerPath, setViewerPath] = useState<"new" | "already-open" | null>(null);
  const connected = viewerPath !== null;
  const [edge, setEdge] = useState(false);
  const [message, setMessage] = useState("");
  const [opening, setOpening] = useState(false);
  const pendingLaunch = useRef(false);
  const viewerHelp = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setEdge(/\bEdg\//.test(navigator.userAgent));
    return () => pilot.clearEvidence();
  }, [pilot]);

  function showViewerHelp() {
    const dialog = viewerHelp.current;
    if (dialog?.isConnected && !dialog.open) dialog.showModal();
  }

  async function launch() {
    if (!edge || !automaticLaunchConfigured || pendingLaunch.current) return;
    const tab = window.open("", "_blank");
    if (!tab) { setMessage("Allow this worksheet to open a new tab, then try again."); return; }
    tab.opener = null;
    setMessage("");
    pendingLaunch.current = true;
    setOpening(true);
    try {
      const response = await fetch(SCANNEX_PILOT_LAUNCH, {
        method: "POST", credentials: "same-origin", cache: "no-store", referrerPolicy: "no-referrer",
        headers: { Accept: "application/json" }, signal: AbortSignal.timeout(16_000),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(typeof result?.error === "string" ? result.error : "The Viewer could not be opened. Try again.");
        tab.close();
        return;
      }
      const target = privateIrelandViewerUrl(typeof result?.streamingUrl === "string" ? result.streamingUrl : "");
      if (!target || tab.closed) throw new Error("Viewer tab is unavailable");
      tab.location.replace(target.href);
      setViewerPath("new");
    } catch {
      tab.close();
      setMessage("The Viewer did not open. Keep this worksheet open and try again.");
      return;
    } finally {
      pendingLaunch.current = false;
      setOpening(false);
    }
    // Show the guide on the worksheet, not over or inside the separate AWS tab.
    showViewerHelp();
  }

  const instructions = <section className="pa-card" aria-label="Private Image 78 connection">
    <h3>Open the Scannex Viewer</h3>
    <p>Use the private development Viewer in standalone Edge. Sign in there before recording and share only the Viewer tab.</p>
    <p><a href={GUIDE} download>Download the illustrated recording guide (PDF)</a></p>
    {connected ? <p role="status">{viewerPath === "new" ? "Switch to the new AWS tab to finish setting up the Viewer." : "Continue with your existing development Viewer tab."} Verify Image 78 is visible there before confirming below.</p> :
      !edge ? <p role="status">Open this preview in standalone Microsoft Edge to continue.</p> : <>
      <button type="button" className="primary-button" disabled={opening || !automaticLaunchConfigured}
        aria-describedby={!automaticLaunchConfigured ? "pilot-auto-launch-notice" : undefined}
        onClick={() => void launch()}>{opening ? "Opening the development Viewer…" : "Open Scannex Viewer"}</button>
      {!automaticLaunchConfigured && <p id="pilot-auto-launch-notice">Automatic launch is not enabled for this preview yet. If your private development Viewer is already open, use the option below.</p>}
      <details><summary>Viewer already open?</summary>
        <p>If the private development Viewer is open in Edge and already shows Image 78, keep it open. Do not use the learner practice Viewer.</p>
        <button type="button" className="secondary-button" disabled={opening} onClick={() => { setViewerPath("already-open"); setMessage(""); }}>Use the open development Viewer</button>
      </details></>}
    {message && <p role="alert">{message}</p>}
    <p className="pa-subtle">Striped test pattern or grey Review button? The Viewer is not ready to record.</p>
    <button type="button" className="secondary-button" aria-haspopup="dialog" onClick={showViewerHelp}>Show Viewer setup help</button>
    <ScannexPilotViewerHelp dialogRef={viewerHelp} />
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
