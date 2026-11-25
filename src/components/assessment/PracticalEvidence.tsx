"use client";
import { useEffect, useRef, useState } from "react";
import { PRACTICAL_API, RECORDING_NOTICE, uploadLimit, type FileKind, type PracticalFile } from "@/lib/assessments/scannex-assignment";
import { uploadPracticalFile } from "./practical-client";

export function PracticalEvidence({ assignmentId, caseId, files, locked, onSaved, onBusy }: {
  assignmentId: string; caseId: string; files: PracticalFile[]; locked: boolean; onSaved: (f: PracticalFile) => void; onBusy: (busy: boolean) => void;
}) {
  const [kind, setKind] = useState<FileKind>("viewer_image"), [notice, setNotice] = useState(false), [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false), [busy, setBusy] = useState(false), [pending, setPending] = useState<File | null>(null);
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  async function upload(file: File, selectedKind: FileKind) {
    if (file.size > uploadLimit(selectedKind)) { setMessage(`File too large. Limit: ${selectedKind === "recording" ? "150" : "25"} MiB.`); return; }
    setBusy(true); onBusy(true);
    try { const f = await uploadPracticalFile(file, { assignmentId, caseId, kind: selectedKind, recordingNoticeAccepted: notice }, setMessage); onSaved(f); setPending(null); }
    catch (e) { setPending(selectedKind === "recording" ? file : null); setMessage((e as Error).message); }
    finally { setBusy(false); onBusy(false); }
  }
  async function start() {
    if (!notice || !navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") { setMessage("Screen recording needs a supported desktop browser and your permission. Alternatively upload a recording or native log."); return; }
    try {
      const capture = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 8 }, audio: false });
      stream.current = capture;
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
        const file = new File([blob], `scannex-${caseId}-${Date.now()}.${type === "video/mp4" ? "mp4" : "webm"}`, { type });
        setPending(file); void upload(file, "recording");
      };
      capture.getVideoTracks()[0].addEventListener("ended", () => { if (mr.state === "recording") mr.stop(); });
      mr.start(1000); setRecording(true); onBusy(true);
      setMessage("Recording ON — only your selected surface. Stop and save before changing image. A clip is limited to 10 minutes; add another clip if needed.");
      timer.current = setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 10 * 60 * 1000);
    } catch (e) { stream.current?.getTracks().forEach(t => t.stop()); setMessage((e as Error).message); }
  }
  return <section className="pa-card" aria-label="Private evidence">
    <h3>Record and save your Viewer evidence</h3>
    <p>Each image needs a Viewer screenshot and either a recording or an exported native action log. The worksheet alone is not proof of using the controls. Screenshots with annotations do not prove the order of actions.</p>
    <p className="pa-notice">{RECORDING_NOTICE}</p>
    <label className="pa-check"><input type="checkbox" checked={notice} onChange={e => setNotice(e.target.checked)} disabled={recording || busy || locked} /> I understand the recording notice and have completed all sign-ins.</label>
    <div className="button-row">
      <button type="button" className="primary-button" onClick={() => void start()} disabled={!notice || locked || recording || busy || Boolean(pending)}>Record Viewer window / tab</button>
      <button type="button" className="secondary-button" disabled={!recording} onClick={() => recorder.current?.stop()}>Stop &amp; save recording</button>
    </div>
    <p>Choose the actual Scannex/AWS window or tab in the browser permission picker, not this worksheet. No microphone or webcam is requested. Recording does not start automatically and does not collect native Scannex telemetry.</p>
    {pending && !busy ? <div className="button-row"><button type="button" onClick={() => void upload(pending, "recording")}>Retry saving captured clip</button><button type="button" onClick={() => { const url = URL.createObjectURL(pending), a = document.createElement("a"); a.href = url; a.download = pending.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Download local backup</button><button type="button" onClick={() => { setPending(null); setMessage("Unsaved clip discarded. Record again or upload alternative evidence."); }}>Discard unsaved clip</button></div> : null}
    <div className="pa-grid"><label>Evidence type<select value={kind} disabled={locked || busy || recording} onChange={e => setKind(e.target.value as FileKind)}>
      <option value="viewer_image">Viewer screenshot / annotated image (25 MiB)</option><option value="recording">Recorded session (150 MiB)</option><option value="native_log">Native exported action log (25 MiB)</option><option value="native_result">Native saved result (25 MiB)</option><option value="supporting_report">Supporting report (25 MiB)</option>
    </select></label><label>Upload evidence<input type="file" disabled={locked || busy || recording || (kind === "recording" && !notice)} accept={kind === "recording" ? ".webm,.mp4" : kind === "viewer_image" ? ".png,.jpg,.jpeg,.tif,.tiff" : ".pdf,.txt,.log,.csv,.json,.png,.jpg"} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file, kind); }} /></label></div>
    <p role="status" aria-live="polite">{message}</p>
    <ul>{files.filter(f => f.case_id === caseId && f.status === "verified").map(f => <li key={f.id}><a href={`${PRACTICAL_API}/files/${f.id}`}>{f.original_filename}</a> — {f.kind.replaceAll("_", " ")} · SHA-256 {f.sha256?.slice(0, 12)}…</li>)}</ul>
  </section>;
}
