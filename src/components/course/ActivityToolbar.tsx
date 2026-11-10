"use client";

import { useEffect, useRef, useState, type MouseEventHandler } from "react";

/** Small return controls; the course keeps its own play and slide controls. */
export function ActivityToolbar({ returnHref, onReturn, onReload, resourceHref, courseHref, viewerHref, status, busy = false }: {
  returnHref: string;
  onReturn?: MouseEventHandler<HTMLAnchorElement>;
  onReload: () => void;
  resourceHref?: string;
  courseHref?: string;
  viewerHref?: string;
  status: string;
  busy?: boolean;
}) {
  const navRef = useRef<HTMLElement>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [fullScreenError, setFullScreenError] = useState("");
  const saveFailed = /could not|check your connection/i.test(status);

  useEffect(() => {
    const changed = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  async function toggleFullScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await navRef.current?.closest("main")?.requestFullscreen();
      setFullScreenError("");
    } catch {
      setFullScreenError("Use your browser’s full screen command (F11) instead.");
    }
  }

  return (
    <nav ref={navRef} className="activity-toolbar" aria-label="Learning activity navigation">
      <a className="secondary-button" href={returnHref} onClick={onReturn} aria-disabled={busy}>
        {busy ? "Saving…" : "← Back"}
      </a>
      {courseHref ? <a className="secondary-button" href={courseHref}>Course progress</a> : null}
      {viewerHref ? <a className="secondary-button" href={viewerHref}>Viewer practice</a> : null}
      <span className="activity-live-status" role="status">{status}</span>
      <small aria-hidden="true">{saveFailed ? "Save needs attention" : /saving/i.test(status) ? "Saving…" : /saved|restored/i.test(status) ? "Saved" : "Preparing…"}</small>
      {saveFailed ? <span className="activity-save-warning">Progress needs attention</span> : null}
      <div className="activity-toolbar-actions">
        <button className="secondary-button" type="button" onClick={() => { void toggleFullScreen(); }}>
          {fullScreen ? "Exit full screen" : "Full screen"}
        </button>
        <details className="activity-options">
          <summary aria-label="Presentation options">⋯</summary>
          <div className="activity-options-panel">
            <p>{status}</p>
            {fullScreenError ? <p role="alert">{fullScreenError}</p> : null}
            <button className="secondary-button" type="button" onClick={onReload} disabled={busy}>Reload presentation</button>
            {resourceHref ? <a className="secondary-button" href={resourceHref} target="_blank" rel="noreferrer">Open e-book</a> : null}
          </div>
        </details>
      </div>
    </nav>
  );
}
