"use client";

import { useEffect, useRef, useState } from "react";

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
  title
}: {
  courseSlug: string;
  unitSlug: string;
  launchSrc: string;
  title: string;
}) {
  const valuesRef = useRef<ScormValues | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Preparing your personal learning session…");

  useEffect(() => {
    let active = true;
    const endpoint = `/api/scorm?courseSlug=${encodeURIComponent(courseSlug)}&unitSlug=${encodeURIComponent(unitSlug)}`;

    const save = async () => {
      if (!valuesRef.current) return;
      setStatus("Saving your progress…");
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseSlug, unitSlug, attempt: toAttempt(valuesRef.current) })
      });
      if (response.ok && active) setStatus("Your progress is saved to your learner record.");
      if (!response.ok && active) setStatus("Progress could not be saved. Keep this page open and try again.");
    };

    const load = async () => {
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = response.ok ? await response.json() : { attempt: null };
      if (!active) return;
      valuesRef.current = initialValues(payload.attempt);
      let initialized = false;
      window.API_1484_11 = {
        Initialize: () => { initialized = true; return "true"; },
        Terminate: () => { void save(); initialized = false; return "true"; },
        GetValue: (key: string) => valuesRef.current?.[key] ?? "",
        SetValue: (key: string, value: string) => {
          if (!initialized || !valuesRef.current) return "false";
          valuesRef.current[key] = String(value ?? "");
          return "true";
        },
        Commit: () => { void save(); return "true"; },
        GetLastError: () => "0",
        GetErrorString: () => "No error",
        GetDiagnostic: () => ""
      };
      setStatus("Your progress is saved to your learner record.");
      setReady(true);
    };

    void load();
    const saveBeforeLeaving = () => { void save(); };
    window.addEventListener("pagehide", saveBeforeLeaving);
    return () => {
      active = false;
      window.removeEventListener("pagehide", saveBeforeLeaving);
      void save();
      delete window.API_1484_11;
    };
  }, [courseSlug, unitSlug]);

  return (
    <section aria-label={`${title} SCORM learning activity`}>
      <p className="scorm-status" role="status">{status}</p>
      {ready ? (
        <figure className="media-item">
          <iframe title={`${title} activities and quizzes`} src={launchSrc} allowFullScreen />
          <figcaption>Complete the learning activities and quizzes here. Your resume point and results belong to your learner account.</figcaption>
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
