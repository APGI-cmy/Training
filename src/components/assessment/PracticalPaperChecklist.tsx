"use client";

import { useState } from "react";
import { PRACTICAL_API, validateFile, type PracticalFile } from "@/lib/assessments/scannex-assignment";
import { uploadPracticalFile, type PracticalTransport } from "./practical-client";

export function PracticalPaperChecklist({ assignmentId, imageId, imageLabel, files, locked, onSaved, onBusy, pilotTransport }: {
  assignmentId: string; imageId: string; imageLabel: string; files: PracticalFile[]; locked: boolean;
  onSaved: (file: PracticalFile) => void; onBusy: (busy: boolean) => void;
  pilotTransport?: PracticalTransport;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function attach(file: File) {
    setBusy(true); onBusy(true);
    try {
      if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) throw new Error("Choose a PDF, JPG or PNG copy of the checklist.");
      validateFile("supporting_report", file.name, file.type, file.size);
      const saved = await (pilotTransport?.upload ?? uploadPracticalFile)(file, {assignmentId, caseId: imageId, kind: "supporting_report", recordingNoticeAccepted: false}, setMessage);
      onSaved(saved); setMessage("Paper checklist saved to this image.");
    } catch { setMessage("Could not save the checklist. Choose a PDF, JPG or PNG (up to 25 MiB) and try again."); }
    finally { setBusy(false); onBusy(false); }
  }
  return <section className="pa-mode" aria-label="Attach paper review checklist">
    <h3>Attach the paper checklist for {imageLabel}</h3>
    <p>Write the image reference and each Viewer annotation number on the pages. Attach all checklist pages for this image before continuing. You do not need to repeat them electronically.</p>
    <label>Upload completed paper checklist<input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={locked || busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void attach(f); }} /></label>
    <p role="status">{message}</p>
    {files.filter(f => f.case_id === imageId && f.kind === "supporting_report" && f.status === "verified").map(f => <p key={f.id}>Saved for this image: <a href={pilotTransport ? pilotTransport.evidenceHref(f.id) : `${PRACTICAL_API}/files/${f.id}`} download={f.original_filename}>{f.original_filename}</a></p>)}
  </section>;
}
