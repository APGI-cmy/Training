"use client";
import { useEffect, useRef, useState } from "react";
import { PRACTICAL_API, uploadLimit, type FileKind, type PracticalFile } from "@/lib/assessments/scannex-assignment";
import { uploadPracticalFile, type PracticalTransport } from "./practical-client";

type ClipPurpose = "practice" | "assessment";
const PRACTICE_LIMIT = 2;

export function PracticalEvidence({ assignmentId, caseId, files, locked, onSaved, onBusy, phase, recordingFirst = false, guideHref, viewerReady = true, tabOnly = false, pilotTransport }: {
  assignmentId: string; caseId: string; files: PracticalFile[]; locked: boolean; onSaved: (f: PracticalFile) => void; onBusy: (busy: boolean) => void;
  phase: "recording" | "evidence" | "hidden";
  recordingFirst?: boolean;
  guideHref?: string;
  viewerReady?: boolean;
  tabOnly?: boolean;
  pilotTransport?: PracticalTransport;
}) {
  const [notice, setNotice] = useState(false), [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false), [busy, setBusy] = useState(false), [choosing, setChoosing] = useState(false);
  const [recordAgain, setRecordAgain] = useState(false);
  const [purpose, setPurpose] = useState<ClipPurpose>("assessment");
  const practiceKey = `scannex-preview-practice:${assignmentId}`;
  const scopeCheckKey = `scannex-preview-scope-check:${assignmentId}`;
  const [practiceUsed, setPracticeUsed] = useState(() => recordingFirst && typeof window !== "undefined" ? Number(sessionStorage.getItem(practiceKey) ?? 0) : 0);
  const [scopeChecked, setScopeChecked] = useState(() => tabOnly && typeof window !== "undefined" && sessionStorage.getItem(scopeCheckKey) === "viewer-only");
  const [practiceClip, setPracticeClip] = useState<Blob | null>(null), [practiceUrl, setPracticeUrl] = useState("");
  const [playClip, setPlayClip] = useState<Blob | null>(null), [playUrl, setPlayUrl] = useState("");
  const [scope, setScope] = useState<"viewer" | "screen">("viewer"), [cleanScreen, setCleanScreen] = useState(false);
  const [localClip, setLocalClip] = useState<{ file: File; needsUpload: boolean } | null>(null);
  const pending = localClip?.needsUpload ? localClip.file : null;
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const showRecorder = phase === "recording";
  const savedEvidence = files.filter(f => f.case_id === caseId && f.status === "verified" && (f.kind === "recording" || f.kind === "native_log"));
  const showCapture = showRecorder && (!recordingFirst || !savedEvidence.length || recordAgain);
  const captureDisabled = recording || busy || locked || choosing;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => {
    if (!practiceClip) { setPracticeUrl(""); return; }
    const url = URL.createObjectURL(practiceClip); setPracticeUrl(url);
    const expiry = setTimeout(() => setPracticeClip(null), 10 * 60 * 1000);
    return () => { clearTimeout(expiry); URL.revokeObjectURL(url); };
  }, [practiceClip]);
  useEffect(() => {
    if (!playClip) { setPlayUrl(""); return; }
    const url = URL.createObjectURL(playClip); setPlayUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [playClip]);
  async function playSaved(file: PracticalFile) {
    try {
      const blob = pilotTransport ? pilotTransport.evidence(file.id) : await (async () => {
        const response = await fetch(`${PRACTICAL_API}/files/${file.id}`, {cache: "no-store"});
        return response.ok ? response.blob() : null;
      })();
      if (!blob) throw new Error("Could not open the saved recording. Try again.");
      if (mounted.current) setPlayClip(blob.slice(0, blob.size, file.mime_type));
    } catch (e) { if (mounted.current) setMessage((e as Error).message); }
  }
  async function upload(file: File, selectedKind: FileKind, acknowledged = notice) {
    if (selectedKind === "recording") setLocalClip({ file, needsUpload: true });
    if (file.size > uploadLimit(selectedKind)) { setMessage(`File too large. Limit: ${selectedKind === "recording" ? "150" : "25"} MiB.`); return; }
    setBusy(true); onBusy(true);
    try {
      const f = await (pilotTransport?.upload ?? uploadPracticalFile)(file, { assignmentId, caseId, kind: selectedKind, recordingNoticeAccepted: acknowledged }, setMessage);
      onSaved(f);
      setRecordAgain(false);
      if (selectedKind === "recording") setLocalClip(clip => clip?.file === file ? { file, needsUpload: false } : clip);
      if (recordingFirst && selectedKind === "recording") { setPracticeClip(null); setPlayClip(file); }
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); onBusy(false); }
  }
  function downloadLocalBackup(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function start(target: ClipPurpose = "assessment") {
    if (!viewerReady || captureDisabled || (scope === "screen" && !cleanScreen) || (target === "practice" && practiceUsed >= PRACTICE_LIMIT)) return;
    if (tabOnly && !/\bEdg\//.test(navigator.userAgent)) { setMessage("Open this test in the standalone Microsoft Edge browser, not in the adjacent Codex pane."); return; }
    if (tabOnly && target === "assessment" && !scopeChecked) { setMessage("Play a short practice clip first and confirm that it shows only the Viewer."); return; }
    if ((!notice && !recordingFirst) || !navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") { setMessage("Screen recording needs a supported desktop browser and your permission. Alternatively upload a recording or native log."); return; }
    let started = false;
    setPurpose(target); setChoosing(true); onBusy(true);
    if (recordingFirst) setNotice(true);
    try {
      const preferences = tabOnly ? { selfBrowserSurface: "exclude", monitorTypeSurfaces: "exclude", surfaceSwitching: "exclude" } as const : {};
      const capture = await navigator.mediaDevices.getDisplayMedia({ ...preferences, video: { frameRate: 8, displaySurface: scope === "screen" ? "monitor" : "browser" }, audio: false });
      stream.current = capture;
      const surface = capture.getVideoTracks()[0]?.getSettings().displaySurface;
      if (tabOnly ? surface !== "browser" : scope === "screen" ? surface !== "monitor" : surface !== "browser" && surface !== "window") {
        throw new Error(tabOnly ? "Choose the Viewer under the Edge tab list, not a window or your entire screen. Nothing was recorded." : scope === "screen" ? "Select the clean dedicated display under Entire Screen. Nothing was recorded."
          : "Select the assessment Viewer tab or window. Entire Screen requires the dedicated-display option; nothing was recorded.");
      }
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find(m => MediaRecorder.isTypeSupported(m));
      if (!mime) { capture.getTracks().forEach(t => t.stop()); throw new Error("This browser has no supported recorder. Upload an externally recorded video instead."); }
      const mr = new MediaRecorder(capture, { mimeType: mime, videoBitsPerSecond: 1_500_000 }); recorder.current = mr;
      const chunks: Blob[] = [];
      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mr.onerror = () => { setMessage("Capture was interrupted. Review the clip before using it as evidence."); };
      mr.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        capture.getTracks().forEach(t => t.stop());
        if (!mounted.current) return;
        setRecording(false); onBusy(false);
        const type = mime.split(";")[0], blob = new Blob(chunks, { type });
        if (!blob.size) { setMessage("No recording was captured. Please record again."); return; }
        if (target === "practice") {
          const count = practiceUsed + 1;
          sessionStorage.setItem(practiceKey, String(count)); setPracticeUsed(count);
          setPracticeClip(blob); setMessage("Practice clip ready to play. It will not be submitted."); return;
        }
        const file = new File([blob], `scannex-${caseId}-${Date.now()}.${type === "video/mp4" ? "mp4" : "webm"}`, { type });
        void upload(file, "recording", notice || recordingFirst);
      };
      capture.getVideoTracks()[0].addEventListener("ended", () => { if (mr.state === "recording") mr.stop(); });
      mr.start(1000); started = true; setRecording(true); onBusy(true);
      setMessage(recordingFirst ? `${target === "practice" ? "Practice" : "Live"} recording ON — switch to the Viewer now.` : "Recording ON — return to Scannex and demonstrate the checklist. Stop and save before changing exercise. The recording stops after 10 minutes.");
      timer.current = setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 10 * 60 * 1000);
    } catch (e) { stream.current?.getTracks().forEach(t => t.stop()); setMessage((e as Error).message); }
    finally { setChoosing(false); if (!started) onBusy(false); }
  }
  return <section className="pa-card pa-evidence" aria-label="Private evidence" hidden={phase === "hidden"}>
    {showRecorder && recordingFirst && savedEvidence.length ? <>
      <p className="pa-notice" role="status"><strong>{pilotTransport ? "Pilot recording saved in this tab." : savedEvidence.some(f => f.kind === "recording") ? "Recording saved for assessment." : "Evidence saved for assessment."}</strong> {pilotTransport ? "Play it here or save a private backup before closing this tab." : savedEvidence.length === 1 ? "No download, upload or screenshot needed." : "If you saved more than one clip, choose the one showing your scan in the next step."}</p>
      {!showCapture ? <details><summary>Need to record again?</summary><p>Only record again if the saved clip doesn’t show your work clearly.</p><button type="button" disabled={captureDisabled} onClick={() => setRecordAgain(true)}>Record again</button></details> : null}
    </> : null}
    {showRecorder && recordingFirst && savedEvidence.some(f => f.kind === "recording") ? <details open={playUrl ? true : undefined}>
      <summary>Play saved recording</summary>
      {playUrl ? <video controls preload="metadata" src={playUrl} style={{width: "100%", maxHeight: "55vh"}} aria-label="Saved assessment recording" /> :
        savedEvidence.filter(f => f.kind === "recording").map((f, i) => <button key={f.id} type="button" onClick={() => void playSaved(f)}>{`Load recording ${i + 1}`}</button>)}
    </details> : null}
    {showCapture && recordingFirst ? <>
      {guideHref ? <p><a href={guideHref} download>Download the printable sign-in and recording guide (PDF)</a></p> : null}
      {!recording ? <p>Sign in to <strong>APGI Training</strong> with your course account first. Open the <strong>Assessment Viewer</strong> and finish any Scannex Viewer sign-in. Make the Viewer fill your screen and have your image ready. Then choose a recording below. {tabOnly ? "In standalone Edge, share the Viewer under the tab list, not Window or Entire screen." : "Share only the Viewer tab or window in the browser picker."}</p> : null}
      {recording ? <button type="button" className="primary-button" onClick={() => recorder.current?.stop()}>{purpose === "practice" ? "Stop practice recording" : "Stop & save recording"}</button> : <>
        <p>{practiceUsed >= PRACTICE_LIMIT ? "You have used both practice recordings." : `${PRACTICE_LIMIT - practiceUsed} optional practice ${practiceUsed === 1 ? "recording" : "recordings"} left. Practice clips are never submitted.`}</p>
        {tabOnly && !scopeChecked ? <p><strong>Before live recording:</strong> play one short practice clip. If it includes the worksheet, Codex, or anything outside the Viewer, do not proceed.</p> : null}
        {viewerReady ? <div className="button-row">
          {practiceUsed < PRACTICE_LIMIT && !savedEvidence.length ? <button type="button" disabled={captureDisabled || Boolean(pending)} onClick={() => void start("practice")}>Practice recording</button> : null}
          <button type="button" className="primary-button" disabled={captureDisabled || Boolean(pending) || (tabOnly && !scopeChecked)} onClick={() => void start()}>{pilotTransport ? "Live recording — ungraded pilot" : "Live recording — for assessment"}</button>
        </div> : <p>Return to <strong>Connect &amp; confirm</strong> to check your Viewer session before recording.</p>}
        {practiceUrl ? <details open><summary>Play latest practice recording</summary>
          <p>This clip is temporary. Check that it shows the Viewer and is clear, then use your checklist. Saving a live recording clears this clip.</p>
          <video controls preload="metadata" src={practiceUrl} style={{width: "100%", maxHeight: "55vh"}} aria-label="Practice recording" />
          {tabOnly ? <label className="pa-check"><input type="checkbox" checked={scopeChecked} onChange={e => { const ok = e.target.checked; setScopeChecked(ok); if (ok) sessionStorage.setItem(scopeCheckKey,"viewer-only"); else sessionStorage.removeItem(scopeCheckKey); }} /> I played this clip and it shows only Scannex Viewer, not Codex, the worksheet or my desktop.</label> : null}
        </details> : null}
      </>}
    </> : null}
    {showCapture && !recordingFirst ? <>
    <h3>Choose what to share</h3>
    <p className="pa-notice">The full selected Viewer tab, window, or dedicated clean display will be recorded and saved privately for assessor review. Sign in first. Close unrelated apps and disable notifications before sharing an entire display. No microphone or webcam is recorded.</p>
    <fieldset disabled={captureDisabled}><legend>What will you share?</legend>
      <label className="pa-check"><input type="radio" name={`capture-${caseId}`} checked={scope === "viewer"} onChange={() => setScope("viewer")} /> Entire assessment Viewer tab or window (recommended)</label>
      <label className="pa-check"><input type="radio" name={`capture-${caseId}`} checked={scope === "screen"} onChange={() => setScope("screen")} /> Entire dedicated assessment display</label>
      {scope === "screen" ? <label className="pa-check"><input type="checkbox" checked={cleanScreen} onChange={e => setCleanScreen(e.target.checked)} /> This display shows only assessment work. Unrelated windows and notifications are closed or hidden.</label> : null}
    </fieldset>
    <label className="pa-check"><input type="checkbox" checked={notice} onChange={e => setNotice(e.target.checked)} disabled={captureDisabled} /> I understand the recording notice and have completed all sign-ins.</label>
    <div className="button-row">
      <button type="button" className="primary-button" onClick={() => void start()} disabled={!notice || captureDisabled || Boolean(pending) || (scope === "screen" && !cleanScreen)}>{scope === "screen" ? "Record assessment display" : "Record Viewer tab or window"}</button>
      <button type="button" className="secondary-button" disabled={!recording} onClick={() => recorder.current?.stop()}>Stop &amp; save recording</button>
    </div>
    <p>In the browser share picker, choose the assessment Viewer or the dedicated display you selected above. Never choose this worksheet tab. Return here to stop, or use your browser’s Stop sharing control. One continuous clip is best for the scan timings.</p>
    </> : null}
    {localClip && (pilotTransport || !recordingFirst || (pending && !busy)) ? <>
      {recordingFirst && pending && !busy ? <p><strong>The latest recording wasn’t saved.</strong> Retry here before closing the page. Keep any backup private.</p> : null}
      <div className="button-row">
        <button type="button" onClick={() => downloadLocalBackup(localClip.file)}>Download local backup</button>
        {pending && !busy ? <>
          <button type="button" disabled={locked} onClick={() => void upload(pending, "recording")}>Retry saving captured clip</button>
          <button type="button" onClick={() => { setLocalClip(null); setMessage("Unsaved clip discarded. Record again or upload alternative evidence."); }}>Discard unsaved clip</button>
        </> : null}
      </div>
      {!recordingFirst ? <p>Download a copy of the latest clip before switching images or leaving or refreshing this page. Keep the downloaded file private.</p> : null}
    </> : null}
    {showCapture && (!recordingFirst || (!recording && !busy)) ? <details><summary>{recordingFirst ? "Having trouble recording?" : "Use an existing recording or an APGI-approved native action log"}</summary>
      <label className="pa-file">Upload a recording<input type="file" accept=".webm,.mp4" disabled={captureDisabled || !notice} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, "recording"); }} /></label>
      <label className="pa-file">Upload a native log<input type="file" accept=".txt,.log,.csv,.json,.pdf" disabled={captureDisabled} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, "native_log"); }} /></label>
    </details> : null}
    {phase === "evidence" ? <><h3>Save a Viewer screenshot</h3><p>Use a clear Viewer still from this exercise with the native annotation visible, if you made one. Do not upload the desktop or browser screenshot if it shows unrelated information.</p>
      <label>Upload Viewer screenshot<input type="file" disabled={captureDisabled} accept=".png,.jpg,.jpeg,.tif,.tiff" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, "viewer_image"); }} /></label>
      <details><summary>Optional native result or supporting report</summary>
        <label>Upload native result<input type="file" disabled={captureDisabled} accept=".pdf,.txt,.log,.csv,.json,.png,.jpg" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, "native_result"); }} /></label>
        <label>Upload supporting report<input type="file" disabled={captureDisabled} accept=".pdf,.txt,.log,.csv,.json,.png,.jpg" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, "supporting_report"); }} /></label>
      </details></> : null}
    <p role="status" aria-live="polite">{recordingFirst && message === "Evidence verified and saved privately." ? "" : message}</p>
    {!recordingFirst ? <ul>{files.filter(f => f.case_id === caseId && f.status === "verified").map(f => <li key={f.id}><a href={`${PRACTICAL_API}/files/${f.id}`}>{f.original_filename}</a> — {f.kind.replaceAll("_", " ")} · SHA-256 {f.sha256?.slice(0, 12)}…</li>)}</ul> : null}
  </section>;
}
