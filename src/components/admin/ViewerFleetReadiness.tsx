"use client";
import { useState } from "react";

type Result = { checkedAt: string; error?: string | null; limits?: string; capacity?: { state: string; target: number; prepared: number | null; available: number | null; inUse: number | null; ready: boolean } | null };
export function ViewerFleetReadiness() {
  const [result, setResult] = useState<Result | null>(null), [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try { const r = await fetch('/api/admin/scannex-viewer-readiness', { cache: 'no-store' }); const data = await r.json(); setResult(data); }
    catch { setResult({ checkedAt: new Date().toISOString(), error: 'The readiness check could not connect. Please try again.' }); }
    finally { setBusy(false); }
  }
  return <section className="admin-form-card"><h2>Live AWS classroom capacity</h2><p>This reads the production fleet without starting, resizing or ending any sessions.</p><button type="button" className="secondary-button" onClick={check} disabled={busy}>{busy ? 'Checking AWS…' : 'Check live Viewer capacity'}</button><div role="status" aria-live="polite">{result ? <>{result.error ? <p>{result.error}</p> : result.capacity ? <><p><strong>{result.capacity.ready ? 'Target capacity prepared' : 'Not yet ready for the full classroom'}</strong></p><p>Fleet: {result.capacity.state} · Prepared: {result.capacity.prepared ?? 'Unknown'} / {result.capacity.target} · Available: {result.capacity.available ?? 'Unknown'} · In use: {result.capacity.inUse ?? 'Unknown'}</p></> : null}<p>Checked: {result.checkedAt ? new Date(result.checkedAt).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})+' SAST' : 'Not completed'}</p><p>{result.limits}</p></> : null}</div></section>;
}
