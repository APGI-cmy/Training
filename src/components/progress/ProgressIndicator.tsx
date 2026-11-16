export function ProgressIndicator({
  completedUnits,
  totalUnits,
  label = "units complete"
}: {
  completedUnits: number;
  totalUnits: number;
  label?: string;
}) {
  const safeTotal = Math.max(totalUnits, 0);
  const safeCompleted = Math.min(Math.max(completedUnits, 0), safeTotal);
  const percent = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);

  return (
    <div className="course-progress" aria-label="Progress summary">
      <span>{safeCompleted}</span>
      <small>of {safeTotal} {label}</small>
      <progress value={safeCompleted} max={safeTotal || 1} />
      <small>{percent}% complete</small>
    </div>
  );
}
