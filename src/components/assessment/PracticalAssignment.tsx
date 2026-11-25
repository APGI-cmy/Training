"use client";
import { useEffect, useRef, useState } from "react";
import { INTEGRITY_DECLARATION, MODES, REGIONS, REGION_LABELS, PRACTICAL_API, newCandidate, newDocument, submissionIssues,
 type AssignmentDocument, type Candidate, type CasePack, type PracticalAssignment as Assignment, type PracticalFile, type Region } from "@/lib/assessments/scannex-assignment";
import { SCANNEX_PRACTICAL_RUBRIC } from "@/lib/assessments/scannex-practical-rubric";
import { PracticalEvidence } from "./PracticalEvidence";
import { PracticalReport, type Submission } from "./PracticalReport";
import { practicalRequest } from "./practical-client";
import "./practical.css";
type Workspace = { assignment: Assignment | null; pack: CasePack | null; files: PracticalFile[]; name: string; learningComplete: boolean; reference?: string; submissions: Submission[]; reviews: { decision: string; notes: string; final_score: number | null }[] };
const DECISIONS = ["review", "hold", "release"];
function Select({ value, options, onChange, label }: { value: string; options: string[]; onChange: (s: string) => void; label: string }) { return <select aria-label={label} value={value} onChange={e => onChange(e.target.value)}><option value="">Choose…</option>{options.map(v => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select>; }
export function PracticalAssignment() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null), [doc, setDoc] = useState<AssignmentDocument | null>(null);
  const [index, setIndex] = useState(0), [message, setMessage] = useState("Loading your assignment…"), [busy, setBusy] = useState(false), [evidenceBusy, setEvidenceBusy] = useState(false);
  const [signature, setSignature] = useState(""), [declaration, setDeclaration] = useState(false), [showIssues, setShowIssues] = useState(false);
  const saved = useRef(""), docRef = useRef(doc), version = useRef(0), saving = useRef(false), workspaceRef = useRef(workspace), lastError = useRef(false);
  docRef.current = doc; workspaceRef.current = workspace;
  function receive(w: Workspace) { setWorkspace(w); version.current = w.assignment?.draft_version || 0; const d = w.assignment && w.pack ? ("version" in w.assignment.document ? w.assignment.document as AssignmentDocument : newDocument(w.pack.learner_cases)) : null; setDoc(d); saved.current = w.assignment && !("version" in w.assignment.document) ? "" : JSON.stringify(d); }
  useEffect(() => { let alive = true; practicalRequest<Workspace>().then(w => { if (alive) { receive(w); setMessage(""); } }).catch(e => { if (alive) setMessage(e.message); }); return () => { alive = false; }; }, []);
  async function save() {
    const w = workspaceRef.current, d = docRef.current;
    if (!w?.assignment || !d || saving.current || !["draft", "changes_requested"].includes(w.assignment.status)) return false;
    const sent = JSON.stringify(d); if (sent === saved.current) return true;
    saving.current = true; setMessage("Saving worksheet…");
    try { const result = await practicalRequest<{ assignment: Assignment }>("", { operation: "save", id: w.assignment.id, expectedVersion: version.current, document: d });
      version.current = result.assignment!.draft_version; saved.current = sent; lastError.current = false;
      setWorkspace(current => current ? { ...current, assignment: result.assignment } : current); setMessage("Worksheet saved. Evidence files save separately."); return true;
    } catch (e) { setMessage((e as Error).message); lastError.current = true; return false; } finally { saving.current = false; }
  }
  useEffect(() => { if (!doc || lastError.current) return; const timer = setTimeout(() => { void save(); }, 1400); return () => clearTimeout(timer); }, [doc]);
  useEffect(() => { const timer = setInterval(() => { if (!lastError.current) void save(); }, 2500); return () => clearInterval(timer); }, []);
  useEffect(() => { const guard = (e: BeforeUnloadEvent) => { if (saving.current || JSON.stringify(docRef.current) !== saved.current || evidenceBusy) { e.preventDefault(); } }; window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard); }, [evidenceBusy]);
  const a = workspace?.assignment, pack = workspace?.pack, locked = !a || !["draft", "changes_requested"].includes(a.status), c = doc?.cases[index];
  function change(fn: (draft: AssignmentDocument) => void) { if (!doc) return; const d = structuredClone(doc); fn(d); lastError.current = false; setDoc(d); }
  function candidate(id: string, key: keyof Candidate, value: unknown) { change(d => { const item = d.cases[index].candidates.find(v => v.id === id)!; Object.assign(item, { [key]: value }); }); }
  async function action(operation: "start" | "submit") {
    if (!a || saving.current) return; setBusy(true);
    try { if (operation === "submit") { const ok = await save(); if (!ok) return; }
      receive(await practicalRequest<Workspace>("", { operation, id: a.id, expectedVersion: version.current, signedName: signature, declaration }));
      setMessage(operation === "submit" ? "Submission saved and locked for assessor review. No mark has been self-awarded." : "Your assignment has started.");
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  const issues = doc && workspace ? submissionIssues(doc, workspace.files) : [];
  return <div className="pa-workspace">
    <section className="pa-card"><p className="eyebrow">Practical assignment · Part B</p><h2>Your assessment workspace</h2>
      <p>Work in the genuine Scannex Viewer. The platform guides the procedure, saves evidence and produces your report. Your assessor reviews the recording or native log against the approved image key and awards the marks.</p>
      <details><summary>Read the checklist and marking expectations before you start</summary>
        <ol><li>Sign in to the Viewer before recording. Open the three assigned files. Confirm each image reference.</li><li>Scan systematically from feet to head. Optimise each F1–F4 view before judging it, then zoom into candidates. Use the contrast/density and other taught controls appropriately; extra clicks alone earn no marks.</li><li>Identify, annotate and comment on each candidate. Record why obvious anatomy or objects can be eliminated; do not delete excluded findings from your report.</li><li>For each remaining or uncertain candidate, complete all four checklist columns. Compare structure, edges, even density spread and density relative to bone. Document the emboss comparison; a much deeper indentation than bone is an exclusion cue requiring a reason, not an automatic software verdict.</li><li>Record a supported Hold, Release or Review decision. Uncertainty requires review, not an assumed clearance. No percentage-of-ticks shortcut is used.</li><li>Save annotated Viewer screenshots, recordings or native logs and any native results. Submit your signed report for assessor review.</li></ol>
        <p>Qualifying reference observations: anomaly present; unstructured appearance; undefined edges; <strong>even density spread</strong>; density in the taught bone/diamond range (3–4). Position and all exclusion factors must be considered. Appearance does not establish material identity by itself.</p>
        <p>Density/spread entries use F1–F2; F3–F4 are marked N/A for those rows. All modes still require optimisation, structure and edge evaluation.</p>
        <table><thead><tr><th>Assessor criterion</th><th>Maximum</th></tr></thead><tbody>{SCANNEX_PRACTICAL_RUBRIC.map(r => <tr key={r.id}><td>{r.id === "diamond_uneven_density" ? "Recognises even density spread (owner-confirmed correction, 25 November 2026)" : r.label}</td><td>{r.maximumScore}</td></tr>)}</tbody></table>
        <p>100 raw marks → 32 practical marks, combined with 68 theory marks. Overall pass: 75/100, no unresolved material safety concern, verified evidence and assessor approval. The historical item limits total 100, not the previously stated 99; this assignment corrects that denominator without changing the weights. The historical density criterion ID is retained for compatibility with the corrected even-density rubric version.</p>
      </details>
      <p role="status" aria-live="polite">{message}</p>
      {workspace && !a ? <p className="pa-notice">Your checklist is available above. APGI must approve the three-image case pack and assign it to your assessment booking before you can begin. No verified diamond-positive case set has been assumed.</p> : null}
      {a ? <p><strong>{workspace.reference}</strong> · attempt record {a.v1_run_id.slice(0, 8)} · {a.status.replaceAll("_", " ")} · revision {a.revision}</p> : null}
      {a?.status === "assigned" ? <button type="button" className="primary-button" disabled={busy || !workspace?.learningComplete} onClick={() => void action("start")}>{workspace?.learningComplete ? "Start my practical assignment" : "Complete LU1–LU8 to begin"}</button> : null}
      {workspace?.reviews.map((r, i) => <p className="pa-notice" key={i}>Assessor: {r.decision.replaceAll("_", " ")}{r.final_score != null ? ` · ${r.final_score}/100 overall` : ""}. {r.notes}</p>)}
    </section>
    {a && pack && doc && c && a.status !== "assigned" ? <>
      <section className="pa-card"><h3>{pack.title}</h3><p>{pack.instructions}</p><fieldset disabled={locked || busy}><legend>Preparation</legend>{(["viewerOpened", "correctImages", "systematicScan"] as const).map((key, i) => <label className="pa-check" key={key}><input type="checkbox" checked={doc.preparation[key]} onChange={e => change(d => { d.preparation[key] = e.target.checked; })} />{["I opened and signed into the genuine Viewer before recording.", "I am using the assigned source images.", "I followed the taught systematic scan procedure."][i]}</label>)}</fieldset></section>
      <nav className="button-row pa-no-print" aria-label="Assessment images">{pack.learner_cases.map((item, i) => <button type="button" key={item.id} aria-current={i === index ? "step" : undefined} disabled={evidenceBusy || busy} onClick={() => setIndex(i)}>Image {i + 1}: {item.title}</button>)}</nav>
      <section className="pa-card"><h2>Image {index + 1} · {pack.learner_cases[index].title}</h2><p>{pack.learner_cases[index].brief}</p>
        {pack.learner_cases[index].sourceFileId ? <a className="secondary-button" href={`${PRACTICAL_API}/files/${pack.learner_cases[index].sourceFileId}`}>Download assigned image for Viewer</a> : null}
        <fieldset disabled={locked || busy}><legend>Optimise and systematically evaluate</legend>
          {MODES.map(m => <section key={m} className="pa-mode"><h3>{m}</h3><p>Clarity benchmark: {pack.learner_cases[index].quality[m]}</p><div className="button-row"><label><input type="checkbox" checked={c.modes[m].used} onChange={e => change(d => { d.cases[index].modes[m].used = e.target.checked; })} /> Used this mode</label><label><input type="checkbox" checked={c.modes[m].tuned} onChange={e => change(d => { d.cases[index].modes[m].tuned = e.target.checked; })} /> Optimised before judging</label></div><label>Adjustments and visible detail<textarea maxLength={1000} value={c.modes[m].clarity} onChange={e => change(d => { d.cases[index].modes[m].clarity = e.target.value; })} /></label></section>)}
          <div className="pa-grid">{REGIONS.map(r => <label key={r}>{REGION_LABELS[r]}<Select value={c.regions[r]} label={`${REGION_LABELS[r]} scan`} options={["not_reviewed", "no_candidate", "candidate_recorded"]} onChange={v => change(d => { d.cases[index].regions[r] = v as typeof c.regions[Region]; })} /></label>)}</div>
          <button type="button" onClick={() => change(d => { const item = newCandidate(crypto.randomUUID(), "abdomen_lower_arm"); d.cases[index].candidates.push(item); d.cases[index].regions[item.region] = "candidate_recorded"; })} disabled={c.candidates.length >= 40}>Add annotated candidate</button>
          {c.candidates.map((item, j) => <section className="pa-candidate" key={item.id}><h3>Candidate {j + 1}</h3><div className="pa-grid"><label>Native Viewer annotation reference<input maxLength={100} value={item.annotation} onChange={e => candidate(item.id, "annotation", e.target.value)} /></label><label>Region<Select label="Candidate region" value={item.region} options={[...REGIONS]} onChange={v => candidate(item.id, "region", v)} /></label><label>Location in image<input maxLength={1000} value={item.location} onChange={e => candidate(item.id, "location", e.target.value)} /></label><label>Elimination screening<Select label="Elimination screening" value={item.elimination} options={["evaluate", "excluded", "uncertain"]} onChange={v => candidate(item.id, "elimination", v)} /></label></div>
            <label>Why excluded, retained or uncertain?<textarea maxLength={4000} value={item.reason} onChange={e => candidate(item.id, "reason", e.target.value)} /></label><label>Viewer comments / remarks<textarea maxLength={4000} value={item.remarks} onChange={e => candidate(item.id, "remarks", e.target.value)} /></label>
            {item.elimination !== "excluded" ? <><div className="pa-table-wrap"><table><caption>Electronic anomaly checklist — all four modes</caption><thead><tr><th>Observation</th>{MODES.map(m => <th key={m}>{m}</th>)}</tr></thead><tbody>{(["anomaly", "structure", "edges", "spread", "density"] as const).map(field => <tr key={field}><th>{field === "spread" ? "Density spread" : field}</th>{MODES.map(m => <td key={m}>{["spread", "density"].includes(field) && ["F3", "F4"].includes(m) ? "N/A" : <Select label={`${field} ${m} candidate ${j + 1}`} value={item.modes[m][field]} options={field === "anomaly" ? ["yes", "no", "uncertain"] : field === "structure" ? ["unstructured", "structured", "uncertain"] : field === "edges" ? ["undefined", "defined", "uncertain"] : field === "spread" ? ["even", "uneven", "uncertain"] : ["1", "2", "3", "4", "5", "6", "uncertain"]} onChange={v => change(d => { d.cases[index].candidates[j].modes[m][field] = v; })} />}</td>)}</tr>)}</tbody></table></div>
              {(["densityCheck", "boneComparison", "embossComparison"] as const).map((key, n) => <label key={key}>{["Density check and interpretation", "Compare density with bone", "Emboss comparison and exclusion factors"][n]}<textarea maxLength={4000} value={item[key]} onChange={e => candidate(item.id, key, e.target.value)} /></label>)}
            </> : <p>Excluded candidates remain in the report with their annotation, location and reason. They do not need the detailed qualification grid.</p>}
            <div className="pa-grid"><label>Position<Select label="Position" value={item.position} options={["inside", "outside", "uncertain"]} onChange={v => candidate(item.id, "position", v)} /></label><label>Candidate action<Select label="Candidate action" value={item.decision} options={DECISIONS} onChange={v => candidate(item.id, "decision", v)} /></label></div>
          </section>)}
          <label>Overall image action<Select label="Image action" value={c.decision} options={DECISIONS} onChange={v => change(d => { d.cases[index].decision = v as typeof c.decision; })} /></label><label>Reasoned image conclusion<textarea maxLength={4000} value={c.summary} onChange={e => change(d => { d.cases[index].summary = e.target.value; })} /></label>
        </fieldset>
      </section>
      <PracticalEvidence key={c.caseId} assignmentId={a.id} caseId={c.caseId} files={workspace.files} locked={locked} onBusy={setEvidenceBusy} onSaved={f => setWorkspace(w => w ? { ...w, files: [...w.files.filter(x => x.id !== f.id), f] } : w)} />
      {!locked ? <section className="pa-card"><h2>Submit for assessor review</h2><p>Full report name: <strong>{workspace.name || "Complete your profile first"}</strong>. Submission freezes a snapshot; corrections require the assessor to return a new revision.</p><label>Type your full profile / certificate name<input maxLength={200} value={signature} onChange={e => setSignature(e.target.value)} /></label><label className="pa-check"><input type="checkbox" checked={declaration} onChange={e => setDeclaration(e.target.checked)} />{INTEGRITY_DECLARATION}</label><div className="button-row"><button type="button" disabled={busy || evidenceBusy} onClick={() => void save()}>Save worksheet now</button><button type="button" onClick={() => setShowIssues(true)}>Check submission completeness</button><button type="button" className="primary-button" disabled={busy || evidenceBusy || !declaration || !signature.trim() || issues.length > 0} onClick={() => void action("submit")}>Submit assignment</button></div>{showIssues ? issues.length ? <ul>{issues.map((v, i) => <li key={i}>{v}</li>)}</ul> : <p>Required fields and evidence are present. This is not a correctness or pass check.</p> : null}</section> : null}
    </> : null}
    {workspace?.submissions.map(s => <PracticalReport key={s.id} submission={s} />)}
  </div>;
}
