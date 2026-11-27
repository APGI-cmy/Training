"use client";

import { useEffect, useState } from "react";
import { MODES, PRACTICAL_PATH, REGIONS, REGION_LABELS, SCANNEX_ZOOM_LEVELS } from "@/lib/assessments/scannex-assignment";
import { SCANNEX_LEARNER_TEST } from "@/lib/assessments/scannex-hosted-pilot";
import { PracticalAssignment } from "./PracticalAssignment";
import { openScannexPilotTransport } from "./scannex-pilot-transport";

export function ScannexWorkflowPreview() {
  const [transport] = useState(() => openScannexPilotTransport("learner-test"));
  useEffect(() => () => transport.clearEvidence(), [transport]);
  return <>
    <p className="pa-notice" data-scannex-learner-test><strong>Learner test only.</strong> The images are synthetic. Drafts and recordings stay in this tab and are cleared when you reload or close it. Nothing is uploaded, marked or added to a learner record.</p>
    <PracticalAssignment workflowTest pilotTransport={transport} previewViewerAccess={{
      canConfirm: true, overview: null, sessionStatus: null,
      connect: exercise => <div className="pa-notice">
        <a className="primary-button" target="_blank" rel="noopener noreferrer" href={`${PRACTICAL_PATH}?workflow=${SCANNEX_LEARNER_TEST}&sample=${exercise}`}>Open Test Image {exercise} in the test Viewer</a>
        <p>Keep this worksheet open. In standalone Edge, share the tab titled <strong>Scannex Test Viewer — Image {exercise}</strong>, not the worksheet or your desktop.</p>
      </div>,
    }} />
  </>;
}

const VIEW_COLORS = ["#d5e2ed", "#89d8d0", "#f2ce9d", "#c4b6f5"];
const ZOOM = [0.25, 0.5, 1, 2, 4];

export function ScannexSyntheticViewer({ image }: { image: 1 | 2 | 3 }) {
  const [regionIndex, setRegion] = useState(0), [pan, setPan] = useState(false);
  const [mode, setMode] = useState(0), [zoom, setZoom] = useState(2), [contrast, setContrast] = useState(100);
  const [markers, setMarkers] = useState<Record<number, { id: number; comment: string }>>({});
  const [action, setAction] = useState<"Held" | "Released" | null>(null);
  const region = REGION_LABELS[REGIONS[regionIndex]];
  const marker = markers[regionIndex];
  useEffect(() => {
    const original = document.title;
    document.title = `Scannex Test Viewer — Image ${image}`;
    return () => { document.title = original; };
  }, [image]);
  useEffect(() => {
    if (!pan || regionIndex === REGIONS.length - 1) return;
    const next = setTimeout(() => setRegion(i => i + 1), 1300);
    return () => clearTimeout(next);
  }, [pan, regionIndex]);

  const activePan = pan && regionIndex < REGIONS.length - 1;
  return <main className="content-inner" style={{ paddingBlock: "2rem" }}>
    <p className="eyebrow">Private learner test · no AWS connection</p>
    <h1>Scannex Test Viewer — Image {image}</h1>
    <p>These geometric panels simulate the controls. They are not Scannex scans and have no correct Hold or Release outcome.</p>
    <section className="pa-card" aria-label="Test Viewer controls">
      <div className="button-row">
        <button type="button" onClick={() => { setRegion(0); setPan(true); }}>Auto Pan: feet to head</button>
        <button type="button" disabled={regionIndex === 0} onClick={() => { setPan(false); setRegion(i => i - 1); }}>Previous region</button>
        <button type="button" disabled={regionIndex === REGIONS.length - 1} onClick={() => { setPan(false); setRegion(i => i + 1); }}>Next region</button>
      </div>
      <p role="status"><strong>{region} · {regionIndex + 1} of {REGIONS.length}</strong> {activePan ? "· Auto Pan running" : ""}</p>
      <div className="button-row" aria-label="Modes and zoom">
        {MODES.map((label, i) => <button type="button" key={label} aria-pressed={mode === i} onClick={() => setMode(i)}>{label}</button>)}
        {SCANNEX_ZOOM_LEVELS.map((label, i) => <button type="button" key={label} aria-pressed={zoom === i} onClick={() => setZoom(i)}>{label}</button>)}
      </div>
      <p><label>Contrast <input type="range" min="50" max="160" value={contrast} onChange={e => setContrast(Number(e.target.value))} /></label></p>
      <svg role="img" aria-label={`Synthetic sample ${image}, ${region}, ${MODES[mode]}, ${SCANNEX_ZOOM_LEVELS[zoom]}`} viewBox="0 0 720 270" style={{ width: "100%", maxHeight: "42vh", background: "#102132", borderRadius: 8 }}>
        <g transform={`translate(360 135) scale(${ZOOM[zoom]})`} style={{ filter: `contrast(${contrast}%)` }}>
          <rect x="-254" y="-77" width="508" height="154" rx="24" fill="#385269" />
          {Array.from({ length: 7 }, (_, i) => <rect key={i} x={-230 + i * 72} y={-48 + (i % 3) * 13} width={33 + ((i + regionIndex + image) % 5) * 7} height="72" rx="12" fill={VIEW_COLORS[mode]} opacity={0.25 + ((i + image) % 4) * 0.16} />)}
          <path d={`M -18 -${12 + image * 5} L 18 -12 L 26 12 L -9 22 Z`} fill={VIEW_COLORS[(mode + regionIndex + image) % MODES.length]} />
          {marker && <circle cx="0" cy="0" r="45" stroke="#ffba41" strokeWidth="3" fill="none" />}
        </g>
        <text x="14" y="25" fill="white" fontSize="16">IMAGE {image} · {region} · {MODES[mode]} · {SCANNEX_ZOOM_LEVELS[zoom]}</text>
        {marker && <text x="14" y="252" fill="#ffda99" fontSize="16">Marker {marker.id}: {marker.comment.slice(0, 68)}</text>}
      </svg>
      <div className="button-row">
        <button type="button" disabled={Boolean(marker)} onClick={() => setMarkers(m => ({ ...m, [regionIndex]: { id: Object.keys(m).length + 1, comment: "" } }))}>{marker ? `Marker ${marker.id} in this region` : "Annotate this region"}</button>
        <button type="button" onClick={() => setAction("Held")}>Hold</button>
        <button type="button" onClick={() => setAction("Released")}>Release</button>
      </div>
      {marker && <label>Comment for marker {marker.id}<input maxLength={240} value={marker.comment} onChange={e => setMarkers(m => ({ ...m, [regionIndex]: { ...marker, comment: e.target.value } }))} /></label>}
      {action && <p role="status"><strong>Test action: {action}</strong>. Return to the worksheet to stop and save the recording.</p>}
    </section>
  </main>;
}
