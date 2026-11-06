"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ActivityToolbar } from "@/components/course/ActivityToolbar";

type ScormValues = Record<string, string>;

type ScormAttempt = {
  completion_status?: string | null;
  success_status?: string | null;
  progress_measure?: number | null;
  score_raw?: number | null;
  score_scaled?: number | null;
  score_min?: number | null;
  score_max?: number | null;
  suspend_data?: string | null;
  location?: string | null;
  total_time?: string | null;
  interactions?: Record<string, string> | null;
};

function initialValues(attempt?: ScormAttempt | null): ScormValues {
  return {
    "cmi._version": "1.0",
    "cmi.learner_id": "learner",
    "cmi.learner_name": "Learner",
    "cmi.mode": "normal",
    "cmi.credit": "credit",
    "cmi.entry": attempt?.suspend_data ? "resume" : "ab-initio",
    "cmi.completion_status": attempt?.completion_status ?? "unknown",
    "cmi.success_status": attempt?.success_status ?? "unknown",
    "cmi.progress_measure": attempt?.progress_measure?.toString() ?? "",
    "cmi.score.raw": attempt?.score_raw?.toString() ?? "",
    "cmi.score.scaled": attempt?.score_scaled?.toString() ?? "",
    "cmi.score.min": attempt?.score_min?.toString() ?? "",
    "cmi.score.max": attempt?.score_max?.toString() ?? "",
    "cmi.suspend_data": attempt?.suspend_data ?? "",
    "cmi.location": attempt?.location ?? "",
    "cmi.total_time": attempt?.total_time ?? "",
    ...(attempt?.interactions ?? {})
  };
}

function toAttempt(values: ScormValues): ScormAttempt {
  const numberValue = (key: string) => {
    if (!values[key]?.trim()) return null;
    const value = Number(values[key]);
    return Number.isFinite(value) ? value : null;
  };
  const interactions = Object.fromEntries(
    Object.entries(values).filter(([key]) => key.startsWith("cmi.interactions."))
  );

  return {
    completion_status: values["cmi.completion_status"],
    success_status: values["cmi.success_status"],
    progress_measure: numberValue("cmi.progress_measure"),
    score_raw: numberValue("cmi.score.raw"),
    score_scaled: numberValue("cmi.score.scaled"),
    score_min: numberValue("cmi.score.min"),
    score_max: numberValue("cmi.score.max"),
    suspend_data: values["cmi.suspend_data"],
    location: values["cmi.location"],
    total_time: values["cmi.total_time"],
    interactions
  };
}

export function ScormPlayer({
  courseSlug,
  unitSlug,
  launchSrc,
  title,
  mode = "learner",
  immersive = false,
  returnHref,
  resourceHref
}: {
  courseSlug: string;
  unitSlug: string;
  launchSrc: string;
  title: string;
  mode?: "learner" | "preview";
  immersive?: boolean;
  returnHref?: string;
  resourceHref?: string;
}) {
  const valuesRef = useRef<ScormValues | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Preparing your personal learning session…");
  const saveProgressRef = useRef<(() => Promise<boolean>) | null>(null);
  const [leaving, setLeaving] = useState(false);

  async function returnToUnit(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (leaving || !returnHref) return;
    setLeaving(true);
    const saved = await saveProgressRef.current?.() ?? true;
    if (saved) window.location.assign(returnHref);
    else setLeaving(false);
  }

  async function reloadActivity() {
    if (leaving) return;
    setLeaving(true);
    const saved = await saveProgressRef.current?.() ?? true;
    if (saved) window.location.reload();
    else setLeaving(false);
  }

  useEffect(() => {
    let active = true;
    const endpoint = `/api/scorm?courseSlug=${encodeURIComponent(courseSlug)}&unitSlug=${encodeURIComponent(unitSlug)}`;

    const installApi = (saveProgress?: () => void) => {
      let initialized = false;
      window.API_1484_11 = {
        Initialize: () => { initialized = true; return "true"; },
        Terminate: () => { saveProgress?.(); initialized = false; return "true"; },
        GetValue: (key: string) => valuesRef.current?.[key] ?? "",
        SetValue: (key: string, value: string) => {
          if (!initialized || !valuesRef.current) return "false";
          valuesRef.current[key] = String(value ?? "");
          return "true";
        },
        Commit: () => { saveProgress?.(); return "true"; },
        GetLastError: () => "0",
        GetErrorString: () => "No error",
        GetDiagnostic: () => ""
      };
    };

    if (mode === "preview") {
      valuesRef.current = initialValues();
      installApi();
      setStatus("Administrator preview — learner progress is not recorded.");
      setReady(true);

      return () => {
        active = false;
        delete window.API_1484_11;
      };
    }

    // Keep commits in order so an older request cannot overwrite the return save.
    let saveQueue: Promise<boolean> = Promise.resolve(true);
    const save = () => {
      saveQueue = saveQueue.then(persistProgress);
      return saveQueue;
    };
    const persistProgress = async () => {
      if (!valuesRef.current) return true;
      if (active) setStatus("Saving your progress…");
      try {
        const body = JSON.stringify({ courseSlug, unitSlug, attempt: toAttempt(valuesRef.current) });
        const response = await fetch(endpoint, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body,
          keepalive: new Blob([body]).size <= 60_000
        });
        if (active) setStatus(response.ok
          ? "Your progress is saved to your learner record."
          : "Progress could not be saved. Keep this page open and try again.");
        return response.ok;
      } catch {
        if (active) setStatus("Progress could not be saved. Check your connection and try again.");
        return false;
      }
    };
    saveProgressRef.current = save;

    const load = async () => {
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = response.ok ? await response.json() : { attempt: null };
      if (!active) return;
      valuesRef.current = initialValues(payload.attempt);
      installApi(() => { void save(); });
      setStatus("Your progress is saved to your learner record.");
      setReady(true);
    };

    void load();
    // Embedded SCORM runtimes need a fresh document on route changes. Finish
    // their queued saves before following a same-tab link to that document.
    let navigating = false;
    const saveBeforeNavigation = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.download || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || (destination.pathname === window.location.pathname && destination.search === window.location.search)) return;
      event.preventDefault(); event.stopPropagation();
      if (navigating) return;
      navigating = true; setLeaving(true);
      void save().then(saved => {
        if (saved) window.location.assign(destination.href);
        else { navigating = false; setLeaving(false); }
      });
    };
    document.addEventListener("click", saveBeforeNavigation, true);
    const saveBeforeLeaving = () => { void save(); };
    window.addEventListener("pagehide", saveBeforeLeaving);
    return () => {
      active = false;
      saveProgressRef.current = null;
      document.removeEventListener("click", saveBeforeNavigation, true);
      window.removeEventListener("pagehide", saveBeforeLeaving);
      void save();
      delete window.API_1484_11;
    };
  }, [courseSlug, mode, unitSlug]);

  return (
    <section className={immersive ? "scorm-player-immersive" : undefined} aria-label={`${title} SCORM learning activity`}>
      {immersive && returnHref ? (
        <ActivityToolbar returnHref={returnHref} onReturn={returnToUnit} onReload={() => { void reloadActivity(); }} resourceHref={resourceHref} status={status} busy={leaving} />
      ) : null}
      {!immersive && <p className="scorm-status" role="status">{status}</p>}
      {ready && !immersive && <p className="activity-recovery">
        <button className="secondary-button" type="button" onClick={reloadActivity} disabled={leaving}>
          {leaving ? "Saving…" : "Reload learning activity"}
        </button>
        {" "}If the presentation is blank, reload it here. Your saved progress is retained.
      </p>}
      {ready ? (
        <figure className="media-item">
          <iframe key={`${courseSlug}:${unitSlug}:${launchSrc}`} title={`${title} activities and quizzes`} src={launchSrc} allow="fullscreen" allowFullScreen />
          {!immersive && (
            <figcaption>
              {mode === "preview"
                ? "Administrator preview only — this activity cannot create or change learner progress."
                : "Complete the learning activities and quizzes here. Your resume point and results belong to your learner account."}
            </figcaption>
          )}
        </figure>
      ) : null}
    </section>
  );
}

declare global {
  interface Window {
    API_1484_11?: Record<string, unknown>;
  }
}
