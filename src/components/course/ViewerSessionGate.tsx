"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ViewerEndSessionInstructions } from "./ViewerEndSessionInstructions";
import { viewerSessionCheckUnavailable, type ViewerSessionStatus } from "@/lib/services/viewer-lab/viewer-session-policy";

export function ViewerSessionGate({ courseSlug, unitSlug, initialStatus, children }: {
  courseSlug: string; unitSlug: string; initialStatus: ViewerSessionStatus; children?: ReactNode;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(initialStatus.canProceed);
  const endpoint = `/learn/${encodeURIComponent(courseSlug)}/units/${encodeURIComponent(unitSlug)}/viewer-lab/session`;

  useEffect(() => {
    if (!initialStatus.canProceed) return;
    const controller = new AbortController();
    // Recheck cached/prefetched pages before mounting a learning activity.
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session check failed");
        const result = await response.json() as ViewerSessionStatus;
        if (!controller.signal.aborted) { setStatus(result); setChecking(false); }
      })
      .catch(() => {
        if (!controller.signal.aborted) { setStatus({ ...viewerSessionCheckUnavailable, sourceUnitSlug: initialStatus.sourceUnitSlug }); setChecking(false); }
      });
    return () => controller.abort();
  }, [endpoint, initialStatus.canProceed, initialStatus.sourceUnitSlug]);

  async function checkAgain() {
    setChecking(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error("Session check failed");
      const result = await response.json() as ViewerSessionStatus;
      if (result.canProceed) {
        // Reload to receive the activity that the server withheld while blocked.
        window.location.reload();
        return;
      }
      setStatus(result);
    } catch { setStatus({ ...viewerSessionCheckUnavailable, sourceUnitSlug: status.sourceUnitSlug }); }
    setChecking(false);
  }

  if (!checking && status.canProceed && children) return children;
  return (
    <main className="content-band">
      <div className="content-inner">
        <section className="unit-resources" aria-labelledby="viewer-session-end-heading">
          <p className="eyebrow">Before continuing</p>
          <h1 className="viewer-session-heading" id="viewer-session-end-heading">{checking ? "Checking your Viewer session…" : "End your Viewer session"}</h1>
          <aside className="app-toast app-toast--warning app-toast--inline" role="status" aria-live="polite">
            <div><p>{checking ? "Please wait while we check whether you can open this learning unit." : status.message}</p></div>
          </aside>
          <ViewerEndSessionInstructions />
          <div className="button-row">
            <button className="primary-button" type="button" disabled={checking} onClick={checkAgain}>
              {checking ? "Checking…" : "Check session and continue"}
            </button>
            {status.sourceUnitSlug ? <a className="secondary-button" href={`/learn/${courseSlug}/units/${encodeURIComponent(status.sourceUnitSlug)}`}>Return to your practice unit</a> : <a className="secondary-button" href={`/learn/${courseSlug}`}>Return to course</a>}
          </div>
        </section>
      </div>
    </main>
  );
}
