import { MODES, REGIONS, REGION_LABELS, SCANNEX_ZOOM_LEVELS, elapsedScanSeconds, newCandidate, newScanSequence, scanSequenceOrder, scanTimingEvidence,
  type Candidate, type CaseWorksheet, type Decision, type LearnerCase, type Observation, type PracticalFile, type Region
} from "@/lib/assessments/scannex-assignment";

type Fields = { value: CaseWorksheet; change: (fn: (draft: CaseWorksheet) => void) => void };
const DECISIONS = ["review", "hold", "release"] as const;
const CHARACTERISTICS: (keyof Observation)[] = ["anomaly", "structure", "edges", "spread", "density"];
const OBSERVATION_OPTIONS: Record<keyof Observation, readonly string[]> = {
  anomaly: ["yes", "no", "uncertain"],
  structure: ["unstructured", "structured", "uncertain"],
  edges: ["undefined", "defined", "uncertain"],
  spread: ["even", "uneven", "uncertain"],
  density: ["1", "2", "3", "4", "5", "6", "uncertain"],
};
const LABELS: Record<string, string> = {
  evaluate: "Retained — apply the checklist", excluded: "Ruled out", uncertain: "Uncertain — review",
  not_reviewed: "Not yet reviewed", no_candidate: "Checked, no candidate", candidate_recorded: "Checked, candidate found",
  review: "Review / second opinion", hold: "Hold", release: "Release",
};

function Select({ value, options, labels = LABELS, onChange, label }: {
  value: string; options: readonly string[]; labels?: Record<string, string>; onChange: (s: string) => void; label: string;
}) {
  return <select aria-label={label} value={value} onChange={e => { if (e.target.value) onChange(e.target.value); }}><option value="" disabled>Choose…</option>
    {options.map(v => <option key={v} value={v}>{labels[v] ?? v}</option>)}
  </select>;
}

export function PracticalModeFields({ value: c, change, item, orderedReview = false }: Fields & { item: LearnerCase; orderedReview?: boolean }) {
  return <div className="pa-grid">
      {MODES.map(m => <section key={m} className="pa-mode pa-guided-mode"><h3>{m}</h3>
        {item.quality[m] ? <p>Clarity benchmark: {item.quality[m]}</p> : null}
        {orderedReview ? <label className="pa-check"><input type="checkbox" checked={c.modes[m].used && c.modes[m].tuned} onChange={e => change(d => { d.modes[m].used = e.target.checked; d.modes[m].tuned = e.target.checked; })} /> Used {m} and tried to improve clarity</label> : <>
        <label className="pa-check"><input type="checkbox" checked={c.modes[m].used} onChange={e => change(d => { d.modes[m].used = e.target.checked; })} /> Used {m}</label>
        <label className="pa-check"><input type="checkbox" checked={c.modes[m].tuned} onChange={e => change(d => { d.modes[m].tuned = e.target.checked; })} /> Adjusted {m} before judging</label></>}
        <label>Adjustments and visible detail in {m}<textarea maxLength={1000} value={c.modes[m].clarity} onChange={e => change(d => { d.modes[m].clarity = e.target.value; })} /></label>
      </section>)}
    </div>;
}

export function PracticalScanFields({ value: c, change, item, files, recordingFirst = false, orderedReview = false }: Fields & { item: LearnerCase; files: PracticalFile[]; recordingFirst?: boolean; orderedReview?: boolean }) {
  const timingSources = scanTimingEvidence(files, c.caseId);
  const automaticallyLinked = recordingFirst && timingSources.length === 1 && timingSources[0].id === c.scanSequence?.evidenceFileId;
  const order = scanSequenceOrder(c.scanSequence);
  return <>
    {orderedReview ? <label className="pa-check"><input type="checkbox" checked={c.autoPanCompleted ?? false} onChange={e => change(d => { d.autoPanCompleted = e.target.checked; })} /> I used Auto Pan to inspect the entire image from feet to head.</label> : <PracticalModeFields value={c} change={change} item={item} />}
    <section className="pa-mode" aria-label="Timestamped scan sequence">
      <h3>Timestamped scan sequence</h3>
      <p>{automaticallyLinked ? "Your saved evidence is already linked. " : "Choose the evidence for this exercise. "}For each region, enter the actual completion time from the start of the clip or native log (<strong>MM:SS</strong>). {!automaticallyLinked ? "If you change the source, recheck the times. " : null}Don’t invent or reorder timestamps.</p>
      {!automaticallyLinked ? <label>{recordingFirst ? "Which recording or log shows this scan?" : "Scan timing source (required)"}
        <select value={c.scanSequence?.evidenceFileId ?? ""} onChange={e => change(d => {
          const next = e.target.value || null;
          const prior = d.scanSequence?.evidenceFileId ?? null;
          if (prior !== next) d.scanSequence = { ...newScanSequence(), evidenceFileId: next };
        })}>
          <option value="">Choose a verified recording or native log</option>
          {timingSources.map(f => <option key={f.id} value={f.id}>{f.original_filename} · {f.kind === "recording" ? "recording" : "native log"}{f.sha256 ? " · " + f.sha256.slice(0, 8) : ""}</option>)}
        </select>
      </label> : null}
      <div className="pa-table-wrap"><table>
        <caption>Six regions in the taught bottom-to-top sequence</caption>
        <thead><tr><th scope="col">Region</th><th scope="col">Outcome</th><th scope="col">Time completed</th></tr></thead>
        <tbody>{REGIONS.map((r, n) => {
          const offset = c.scanSequence?.completedAt[r] ?? "";
          return <tr key={r}><th scope="row">{n + 1}. {REGION_LABELS[r]}</th>
            <td><Select value={c.regions[r]} label={`${REGION_LABELS[r]} scan`} options={["not_reviewed", "no_candidate", "candidate_recorded"]} onChange={v => change(d => { d.regions[r] = v as CaseWorksheet["regions"][Region]; })} /></td>
            <td><input type="text" aria-label={`${REGION_LABELS[r]} checkpoint time`} maxLength={5} placeholder="MM:SS"
              aria-invalid={offset !== "" && elapsedScanSeconds(offset) === null} value={offset}
              onChange={e => change(d => { (d.scanSequence ??= newScanSequence()).completedAt[r] = e.target.value; })} /></td>
          </tr>;
        })}</tbody>
      </table></div>
      <p role="status">{order === "review" ? "Some times are equal or out of order. Keep the actual times; your assessor will review the sequence."
        : order === "in_order" ? "The times you entered are in bottom-to-top order. Your assessor will check them against the evidence."
        : "Enter all six checkpoint times."}</p>
    </section>
  </>;
}

export function PracticalFindingsFields({ value: c, change, orderedReview = false }: Fields & { orderedReview?: boolean }) {
  const ready = c.candidates.every(a => a.annotation.trim() && a.location.trim() && a.remarks.trim() && a.reason.trim());
  const needsReview = c.candidates.some(a => a.elimination !== "excluded");
  function changeCandidate<K extends keyof Candidate>(id: string, key: K, val: Candidate[K]) {
    change(d => {
      const item = d.candidates.find(candidate => candidate.id === id);
      if (!item) return;
      const priorRegion = item.region;
      item[key] = val;
      if (orderedReview && (["region", "annotation", "location", "elimination", "reason", "remarks"] as (keyof Candidate)[]).includes(key)) d.screeningComplete = false;
      if (key === "region" && item.region !== priorRegion) {
        d.regions[item.region] = "candidate_recorded";
        if (!d.candidates.some(candidate => candidate.region === priorRegion)) d.regions[priorRegion] = "not_reviewed";
      }
    });
  }
  return <>
    <p>{orderedReview ? "Enter the obvious lookalikes first. Explain what you can see that rules each one out. Then enter anything you flagged for review. A single bright, dark or sharp-edged spot is not enough to identify its material." : "For each annotated candidate, record its Viewer marker number and copy or summarise the native comment. If no candidates were found, check that all six scan rows say Checked, no candidate. Don’t add a placeholder candidate."}</p>
    <button type="button" className="secondary-button" onClick={() => change(d => {
      const region = REGIONS.find(r => d.regions[r] === "candidate_recorded" && !d.candidates.some(a => a.region === r)) ?? "abdomen_lower_arm";
      const a = newCandidate(crypto.randomUUID(), region);
      if (orderedReview) { a.elimination = "uncertain"; d.screeningComplete = false; }
      d.candidates.push(a); d.regions[region] = "candidate_recorded";
    })} disabled={c.candidates.length >= 40}>Add annotated candidate</button>
    {c.candidates.map((item, j) => <section className="pa-candidate" key={item.id}>
      <h3>Candidate {j + 1}</h3>
      <div className="pa-grid">
        <label>Native Viewer annotation reference<input maxLength={100} value={item.annotation} onChange={e => changeCandidate(item.id, "annotation", e.target.value)} /></label>
        <label>Region<Select label={`Candidate ${j + 1} region`} labels={REGION_LABELS} value={item.region} options={REGIONS} onChange={v => changeCandidate(item.id, "region", v as Region)} /></label>
        <label>Location in image<input maxLength={1000} value={item.location} onChange={e => changeCandidate(item.id, "location", e.target.value)} /></label>
        <label>Elimination screening<Select label={`Candidate ${j + 1} elimination screening`} value={orderedReview && item.elimination === "evaluate" ? "uncertain" : item.elimination} options={orderedReview ? ["excluded", "uncertain"] : ["evaluate", "excluded", "uncertain"]} labels={orderedReview ? {excluded: "Clearly ruled out", uncertain: "Flagged for my review"} : LABELS} onChange={v => changeCandidate(item.id, "elimination", v as Candidate["elimination"])} /></label>
      </div>
      <label>Viewer observation / remarks (required)<textarea maxLength={4000} value={item.remarks} onChange={e => changeCandidate(item.id, "remarks", e.target.value)} /></label>
      <label>{orderedReview && item.elimination === "excluded" ? "Why this is not a diamond (required)" : "Reason for this candidate (required)"}<textarea maxLength={4000} placeholder={orderedReview && item.elimination === "excluded" ? "For example: a key, because I could see both the ring and the cut teeth." : "What visible feature made you retain, rule out or leave this candidate unresolved?"} value={item.reason} onChange={e => changeCandidate(item.id, "reason", e.target.value)} /></label>
      {item.elimination === "excluded" ? <p>This finding stays in your report with its native annotation, location and reason. A ruled-out candidate does not need the full grid.</p> : (!orderedReview || (c.screeningComplete && c.checklistSource !== "paper")) ? <>
        <div className="pa-table-wrap"><table>
          <caption>Electronic anomaly checklist — all four modes</caption>
          <thead><tr><th scope="col">Observation</th>{MODES.map(m => <th scope="col" key={m}>{m}</th>)}</tr></thead>
          <tbody>{CHARACTERISTICS.map(field => <tr key={field}><th scope="row">{field === "spread" ? "Density spread" : field}</th>
            {MODES.map(m => <td key={m}>{(field === "spread" || field === "density") && (m === "F3" || m === "F4") ? "N/A"
              : <Select label={`${field} ${m} candidate ${j + 1}`} value={item.modes[m][field]} options={OBSERVATION_OPTIONS[field]}
                onChange={v => change(d => { const a = d.candidates.find(candidate => candidate.id === item.id); if (a) a.modes[m][field] = v; })} />}</td>)}</tr>)}</tbody>
        </table></div>
        <p>Use Uncertain if you can’t judge a feature. Record what the image shows; even density spread and bone-range density are qualifying observations, not proof of a diamond.</p>
        <label>Density check and interpretation<textarea maxLength={4000} value={item.densityCheck} onChange={e => changeCandidate(item.id, "densityCheck", e.target.value)} /></label>
        <label>Compare density with bone<textarea maxLength={4000} value={item.boneComparison} onChange={e => changeCandidate(item.id, "boneComparison", e.target.value)} /></label>
        <label>Emboss comparison and exclusion factors<textarea maxLength={4000} value={item.embossComparison} onChange={e => changeCandidate(item.id, "embossComparison", e.target.value)} /></label>
      </> : null}
      {(!orderedReview || (c.screeningComplete && item.elimination !== "excluded")) ? <div className="pa-grid">
        <label>Position<Select label={`Candidate ${j + 1} position`} value={item.position} options={["inside", "outside", "uncertain"]} onChange={v => changeCandidate(item.id, "position", v as Candidate["position"])} /></label>
        <label>{orderedReview ? "Result of your detailed review" : "Candidate action"}<Select label={`Candidate ${j + 1} action`} value={item.decision} options={DECISIONS} labels={orderedReview ? {review: "Still unresolved", hold: "Still suspicious", release: "Ruled out after review"} : LABELS} onChange={v => changeCandidate(item.id, "decision", v as Decision)} /></label>
      </div> : null}
      <button type="button" className="secondary-button" onClick={() => change(d => {
        d.candidates = d.candidates.filter(candidate => candidate.id !== item.id);
        if (orderedReview) d.screeningComplete = false;
        if (!d.candidates.some(candidate => candidate.region === item.region)) d.regions[item.region] = "not_reviewed";
      })}>Remove Candidate {j + 1} from this draft</button>
    </section>)}
    {orderedReview ? <>
      <label className="pa-check"><input type="checkbox" disabled={!ready} checked={c.screeningComplete ?? false} onChange={e => change(d => { d.screeningComplete = e.target.checked; })} /> I finished the initial screen and explained any exclusions.</label>
      {c.screeningComplete && needsReview ? <fieldset>
        <legend>Zoom levels shown in your recording</legend>
        <p>Centre the flagged anomaly and demonstrate each zoom level. Re-centre it if needed so it stays visible. Tick only the levels you actually showed.</p>
        <div className="button-row">{SCANNEX_ZOOM_LEVELS.map(level => <label className="pa-check" key={level}>
          <input type="checkbox" checked={c.zoomLevels?.includes(level) ?? false} onChange={e => change(d => {
            const next = new Set(d.zoomLevels ?? []);
            if (e.target.checked) next.add(level); else next.delete(level);
            d.zoomLevels = SCANNEX_ZOOM_LEVELS.filter(v => next.has(v));
          })} /> {level}
        </label>)}</div>
      </fieldset> : null}
      {c.screeningComplete && needsReview ? <label>How did you complete the detailed checklist?
        <Select label="Detailed checklist format" value={c.checklistSource ?? "electronic"} options={["electronic", "paper"]} labels={{electronic: "Use the electronic checklist", paper: "Attach my completed paper checklist"}} onChange={v => change(d => { d.checklistSource = v as "paper" | "electronic"; })} />
      </label> : null}
      {c.screeningComplete && !needsReview ? <p>No flagged candidate needs a detailed checklist for this image.</p> : null}
    </> : null}
  </>;
}

export function PracticalDecisionFields({ value: c, change, orderedReview = false }: Fields & { orderedReview?: boolean }) {
  return <>
    <label>{orderedReview ? "Final Viewer action" : "Overall exercise action"}<Select label="Overall exercise action" value={orderedReview && c.decision === "review" ? "" : c.decision} options={orderedReview ? ["hold", "release"] : DECISIONS} onChange={v => change(d => { d.decision = v as Decision; })} /></label>
    <label>Reasoned exercise conclusion<textarea maxLength={4000} value={c.summary}
      placeholder="Refer to the evidence and your checklist. Explain why you chose this action. If you found no candidates, explain what supports that finding."
      onChange={e => change(d => { d.summary = e.target.value; })} /></label>
  </>;
}
