"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CourseShell } from "./CourseShell";
import { getNextLearningAction } from "@/lib/services/completion/get-next-learning-action";
import type { CourseShell as Shell } from "@/lib/services/courses/get-course-shell";
import { emptyPreviewProgress, parsePreviewProgress, previewStorageKey, previewUnitHref, type CoursePreview, type PreviewProgress } from "@/lib/course-preview";

const changedEvent = "apgi-preview-progress";
// Preview data is per account/course/review version, in this tab only. Never use learner keys.
export function readPreviewProgress(scope: string): PreviewProgress {
  try { return parsePreviewProgress(sessionStorage.getItem(previewStorageKey(scope))); }
  catch { return emptyPreviewProgress(); }
}
export function updatePreviewProgress(scope: string, update: (value: PreviewProgress) => PreviewProgress) {
  const next = update(readPreviewProgress(scope));
  try { sessionStorage.setItem(previewStorageKey(scope), JSON.stringify(next)); } catch { /* Playback remains usable when browser storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent(changedEvent, { detail: { scope, value: next } }));
}
export function usePreviewProgress(scope: string) {
  const [snapshot, setSnapshot] = useState({ scope, progress: emptyPreviewProgress() });
  useEffect(() => {
    setSnapshot({ scope, progress: readPreviewProgress(scope) });
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ scope: string; value: PreviewProgress }>).detail;
      if (detail.scope === scope) setSnapshot({ scope, progress: detail.value });
    };
    window.addEventListener(changedEvent, changed);
    return () => window.removeEventListener(changedEvent, changed);
  }, [scope]);
  return snapshot.scope === scope ? snapshot.progress : emptyPreviewProgress();
}

export function PreviewNotice({ preview }: { preview: CoursePreview }) {
  return <aside className="preview-toolbar" aria-label="Learner experience preview">
    <div><strong>Learner experience preview</strong><p>Try the course as a learner. Test progress and quiz results stay in this tab; no enrolment, learner grade or certificate is created.</p>{preview.notice?<p role="status">{preview.notice}</p>:null}</div>
    <div className="button-row"><Link className="secondary-button" href={preview.returnHref}>{preview.returnLabel}</Link>
      <button type="button" className="secondary-button" onClick={() => {
        if (window.confirm("Clear this course’s test progress and resume points? Saved review findings will be kept.")) {
          updatePreviewProgress(preview.scope, emptyPreviewProgress);
          window.location.assign(preview.courseHref);
        }
      }}>Restart preview</button></div>
  </aside>;
}

export function PreviewCourseHome({ shell, preview }: { shell: Shell; preview: CoursePreview }) {
  const progress = usePreviewProgress(preview.scope);
  const units = shell.units.map(unit => ({ ...unit, href: previewUnitHref(preview, unit.slug), isOpened: progress.opened.includes(unit.id), isCompleted: progress.completed.includes(unit.id) }));
  const completedUnits = units.filter(unit => unit.isCompleted).length;
  const testShell = { ...shell, units, firstUnit: units[0], completedUnits, progressPercent: units.length ? Math.round(100 * completedUnits / units.length) : 0, nextAction: getNextLearningAction(units) };
  return <CourseShell shell={testShell} backHref="/catalogue" backLabel="Back to course catalogue" certificateHref={`${preview.courseHref}/certificate`} />;
}

export function PreviewUnitProgress({ scope, unitId, complete = false }: { scope: string; unitId: string; complete?: boolean }) {
  const progress = usePreviewProgress(scope);
  useEffect(() => {
    updatePreviewProgress(scope, current => ({ ...current, opened: [...new Set([...current.opened, unitId])] }));
  }, [scope, unitId]);
  const completed = progress.completed.includes(unitId);
  return complete ? <button className="primary-button" type="button" disabled={completed} onClick={() => updatePreviewProgress(scope, current => ({ ...current, completed: [...new Set([...current.completed, unitId])] }))}>{completed ? "Unit completed" : "Mark unit complete"}</button> : <span>{completed ? "Completed" : "Opened"}</span>;
}
