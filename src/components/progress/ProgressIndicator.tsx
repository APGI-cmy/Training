import { OVERALL_PROGRESS_HELP } from "@/lib/learning-progress-display";

export function ProgressIndicator({
  completedUnits,
  totalUnits,
  overallPercent,
  label = "units complete"
}: {
  completedUnits: number;
  totalUnits: number;
  overallPercent?: number | null;
  label?: string;
}) {
  const safeTotal = Math.max(totalUnits, 0);
  const safeCompleted = Math.min(Math.max(completedUnits, 0), safeTotal);
  const percent = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);

  return (
    <div className="course-progress" aria-label="Progress summary">
      <span>{safeCompleted}</span>
      <small>of {safeTotal} {label}</small>
      {overallPercent === undefined ? <><progress value={safeCompleted} max={safeTotal || 1} /><small>{percent}% complete</small></> :
        <><progress value={overallPercent ?? undefined} max={100} aria-label="Overall learning progress" title={OVERALL_PROGRESS_HELP}/><small title={OVERALL_PROGRESS_HELP}>{overallPercent === null ? "Overall progress temporarily unavailable" : `${overallPercent}% overall progress`}</small></>}
    </div>
  );
}
