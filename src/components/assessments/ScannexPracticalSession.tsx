"use client";

import Script from "next/script";
import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { requestPractical, startPractical, submitPracticalChecklist } from "@/server/actions/assessments/automated-practical";
import type { ChecklistField, PracticalResult } from "@/lib/assessments/automated-practical";

type ResultSummary = Pick<PracticalResult, "status" | "practicalScore" | "practicalMaximum" | "practicalContribution" | "theoryScore" | "finalScore" | "safetyFailure">;
type SessionProps = {
  request: { id: string; status: string; preferredDate: string; opensAt: string | null; closesAt: string | null } | null;
  attempt: { id: string; submitted: boolean; result: ResultSummary | null; instructions: { title: string; instructions: string; checklist: ChecklistField[] } } | null;
  liveReady: boolean;
};
declare global {
  interface Window { AppStream?: { Embed: new (containerId: string, options: { sessionURL: string }) => { destroy?: () => void } } }
}
function AwsStream({ url }: { url: string }) {
  const containerId = useId().replaceAll(":", "");
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!ready || !window.AppStream) return;
    const node = container.current;
    let embed: { destroy?: () => void } | undefined;
    try { embed = new window.AppStream.Embed(containerId, { sessionURL: url }); } catch { setError(true); }
    return () => { embed?.destroy?.(); node?.replaceChildren(); };
  }, [ready, containerId, url]);
  return <section aria-label="Scannex Viewer" className="scannex-stream-panel">
    <Script src="/vendor/aws-appstream/appstream-embed.js" onReady={() => setReady(true)} onError={() => setError(true)} />
    {error ? <p role="alert">The Viewer connection could not be displayed. Refresh and reconnect within your approved access window.</p> : null}
    <div id={containerId} ref={container} className="scannex-stream-container" />
  </section>;
}
function Result({ result }: { result: ResultSummary }) {
  if (result.status === "incomplete") return <p className="resource-status" role="status">Your assessment evidence is incomplete. No final score has been issued. Your saved work is preserved.</p>;
  return <section className="unit-resources" aria-labelledby="practical-result-title">
    <h2 id="practical-result-title">{result.status === "passed" ? "Assessment passed" : "Not yet competent"}</h2>
    <dl className="scannex-score-summary">
      <div><dt>Practical</dt><dd>{result.practicalScore}/100</dd></div>
      <div><dt>Practical contribution</dt><dd>{result.practicalContribution}/32</dd></div>
      <div><dt>Knowledge</dt><dd>{result.theoryScore}/68</dd></div>
      <div><dt>Final summative score</dt><dd>{result.finalScore}/100</dd></div>
    </dl>
    {result.safetyFailure ? <p>A required safety-critical action was not met.</p> : null}
  </section>;
}
function Checklist({ attemptId, fields, submitted, onSubmitted }: { attemptId: string; fields: ChecklistField[]; submitted: boolean; onSubmitted: () => void }) {
  const [state, action, pending] = useActionState(submitPracticalChecklist, {});
  useEffect(() => { if (state.message) onSubmitted(); }, [state.message, onSubmitted]);
  if (submitted || state.message) return <p role="status">Your checklist has been submitted. We are verifying the native Scannex evidence.</p>;
  return <form action={action} className="form-stack">
    <input name="attemptId" type="hidden" value={attemptId} />
    {fields.map(field => <label key={field.id}>{field.prompt}<select name={`answer_${field.id}`} required defaultValue=""><option value="" disabled>Select your answer</option>{field.options.map(option => <option key={option}>{option}</option>)}</select></label>)}
    <label className="checkbox-label"><input type="checkbox" name="signed" required /> I confirm that these are my own observations and decisions.</label>
    <p>Submitting locks your checklist. Complete the assigned Viewer exercise before submitting.</p>
    {state.error ? <p role="alert" className="form-error">{state.error}</p> : null}
    <button type="submit" className="primary-button" disabled={pending}>{pending ? "Submitting…" : "Submit my assessment"}</button>
  </form>;
}
export function ScannexPracticalSession({ request, attempt, liveReady }: SessionProps) {
  const [readiness, readinessAction, readinessPending] = useActionState(requestPractical, {});
  const [start, startAction, startPending] = useActionState(startPractical, {});
  const [result, setResult] = useState<ResultSummary | null>(attempt?.result ?? null);
  const [submitted, setSubmitted] = useState(attempt?.submitted ?? false);
  const [statusError, setStatusError] = useState("");
  const onSubmitted = useCallback(() => setSubmitted(true), []);
  const activeId = start.attemptId ?? attempt?.id;
  const instructions = start.instructions ?? attempt?.instructions;
  useEffect(() => { if (attempt?.result) setResult(attempt.result); }, [attempt?.result]);
  useEffect(() => {
    if (!activeId || !submitted || result) return;
    let stopped = false;
    const controller = new AbortController();
    const update = async () => {
      try {
        const response = await fetch(`/api/scannex/attempts/${activeId}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json() as { result: ResultSummary | null };
        if (!stopped) { setResult(data.result); setStatusError(""); }
      } catch { if (!stopped) setStatusError("Your saved submission is safe. Result status is temporarily unavailable."); }
    };
    void update();
    const timer = window.setInterval(() => void update(), 15000);
    return () => { stopped = true; controller.abort(); window.clearInterval(timer); };
  }, [activeId, submitted, result]);
  const format = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
  return <div className="scannex-practical-session">
    {result ? <Result result={result} /> : null}
    {!request || ["cancelled", "expired", "completed"].includes(request.status) ? <section className="unit-resources">
      <h2>Request your practical assessment</h2><p>Choose your preferred date. Johan will receive your readiness request and approve an access window.</p>
      <form action={readinessAction} className="form-stack"><label>Preferred date<input type="date" name="preferredDate" required /></label>
        <button type="submit" className="primary-button" disabled={readinessPending}>{readinessPending ? "Saving…" : "I am ready for the practical assessment"}</button>
      </form>
    </section> : <section className="unit-resources">
      <h2>{request.status === "requested" ? "Awaiting access approval" : "Your practical assessment"}</h2>
      <p>Preferred date: {request.preferredDate}</p>
      {request.opensAt && request.closesAt ? <p>Approved access: {format(request.opensAt)} to {format(request.closesAt)} (South African time).</p> : <p>Your readiness request is saved. Return here to see your approved access window.</p>}
      {!liveReady ? <p className="resource-status">The hosted practical is undergoing validation. Your request can be approved in advance; the Viewer will become available once validation is complete.</p> : null}
      {["approved", "in_progress"].includes(request.status) && !submitted && !result ? <form action={startAction}><input type="hidden" name="requestId" value={request.id} /><button className="primary-button" disabled={!liveReady || startPending}>{startPending ? "Connecting…" : activeId ? "Reconnect to my practical" : "Start my practical assessment"}</button></form> : null}
    </section>}
    {readiness.error || start.error ? <p className="form-error" role="alert">{readiness.error || start.error}</p> : null}
    {readiness.message ? <p role="status">{readiness.message}</p> : null}
    {start.streamUrl && !result ? <AwsStream url={start.streamUrl} /> : null}
    {instructions && activeId && !result ? <section className="unit-resources"><h2>{instructions.title}</h2><p className="scannex-instructions">{instructions.instructions}</p><h3>Your examination checklist</h3><Checklist attemptId={activeId} fields={instructions.checklist} submitted={submitted} onSubmitted={onSubmitted} /></section> : null}
    {statusError ? <p role="status">{statusError}</p> : null}
  </div>;
}
