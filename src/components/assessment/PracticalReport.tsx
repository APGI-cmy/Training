"use client";
import { MODES, REGIONS, REGION_LABELS, PRACTICAL_API, type AssignmentDocument, type PracticalFile } from "@/lib/assessments/scannex-assignment";
export type Submission = { id: string; revision: number; snapshot: { document: AssignmentDocument; learnerName: string; learnerId: string; assessmentReference: string; files: PracticalFile[] }; canonical_snapshot: string; sha256: string; signed_name: string; submitted_at: string };
export function PracticalReport({ submission }: { submission: Submission }) {
  const s = submission.snapshot;
  return <article className="pa-report pa-card"><h2>Scannex practical report</h2><p>{s.learnerName} · {s.assessmentReference} · revision {submission.revision} · {new Date(submission.submitted_at).toLocaleString()}</p>
    <p>Signed by typed declaration: {submission.signed_name}. This is an authenticated submission, not a verified handwritten or cryptographic personal signature.</p>
    {s.document.cases.map((c, i) => <section key={c.caseId}><h3>Image {i + 1} — {c.decision.toUpperCase()}</h3><p>{c.summary}</p>
      <table><caption>Systematic scan, bottom to top</caption><tbody>{REGIONS.map(r => <tr key={r}><th>{REGION_LABELS[r]}</th><td>{c.regions[r].replaceAll("_", " ")}</td></tr>)}</tbody></table>
      <table><caption>Mode optimisation — learner declarations, verified by assessor against evidence</caption><tbody>{MODES.map(m => <tr key={m}><th>{m}</th><td>Used: {c.modes[m].used ? "Yes" : "No"}; tuned: {c.modes[m].tuned ? "Yes" : "No"}. {c.modes[m].clarity}</td></tr>)}</tbody></table>
      {c.candidates.map((a, j) => <section key={a.id}><h4>Candidate {j + 1} — {a.annotation} · {REGION_LABELS[a.region]}</h4><p>{a.location} · {a.elimination} · {a.decision.toUpperCase()}</p><p>Elimination / retention reason: {a.reason}</p><p>Remarks: {a.remarks}</p>
        {a.elimination !== "excluded" ? <><div className="pa-table-wrap"><table><thead><tr><th>Observation</th>{MODES.map(m => <th key={m}>{m}</th>)}</tr></thead><tbody>{(["anomaly", "structure", "edges", "spread", "density"] as const).map(field => <tr key={field}><th>{field}</th>{MODES.map(m => <td key={m}>{a.modes[m][field] || "N/A"}</td>)}</tr>)}</tbody></table></div><p>Density check: {a.densityCheck}</p><p>Bone comparison: {a.boneComparison}</p><p>Emboss comparison: {a.embossComparison}</p><p>Position: {a.position}</p></> : null}
      </section>)}
    </section>)}
    <h3>Evidence manifest</h3><ul>{s.files.map(f => <li key={f.id}><a href={`${PRACTICAL_API}/files/${f.id}`}>{f.original_filename}</a> · {f.kind} · {f.size_bytes} bytes<br /><code>{f.sha256}</code></li>)}</ul>
    <p>Snapshot SHA-256: <code>{submission.sha256}</code>. The canonical JSON export is the hash input; a printout alone does not establish authenticity.</p>
    <div className="button-row pa-no-print"><button type="button" onClick={() => window.print()}>Print report</button><button type="button" onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(submission, null, 2)], { type: "application/json" })), a = document.createElement("a"); a.href = url; a.download = `scannex-submission-${submission.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Export report &amp; manifest</button></div>
    <p>For review in this chat, supply this report and the relevant downloaded evidence files separately. The manifest does not embed the recording. No external AI evaluation has run.</p>
  </article>;
}
