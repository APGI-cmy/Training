export interface CompletionEvaluation {
  totalUnits: number;
  completedUnits: number;
  progressPercent: number;
  status: "not_started" | "in_progress" | "completed";
  certificateEligible: boolean;
}

export function evaluateCompletionRule({
  totalUnits,
  completedUnits
}: {
  totalUnits: number;
  completedUnits: number;
}): CompletionEvaluation {
  const safeTotal = Math.max(totalUnits, 0);
  const safeCompleted = Math.min(Math.max(completedUnits, 0), safeTotal);
  const progressPercent = safeTotal === 0 ? 0 : Number(((safeCompleted / safeTotal) * 100).toFixed(2));
  const status = safeCompleted === 0
    ? "not_started"
    : safeCompleted >= safeTotal
      ? "completed"
      : "in_progress";

  return {
    totalUnits: safeTotal,
    completedUnits: safeCompleted,
    progressPercent,
    status,
    certificateEligible: status === "completed"
  };
}
