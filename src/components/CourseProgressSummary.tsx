"use client";

import { useEffect, useState } from "react";

interface CourseProgressSummaryProps {
  unitIds: string[];
}

export function CourseProgressSummary({ unitIds }: CourseProgressSummaryProps) {
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const completed = unitIds.filter(
      (unitId) => window.localStorage.getItem(`apgi-training-progress-${unitId}`) === "complete"
    );

    setCompletedCount(completed.length);
  }, [unitIds]);

  return (
    <div className="course-progress" aria-label="Course progress">
      <div>
        <span>{completedCount}</span>
        <small>of {unitIds.length} complete</small>
      </div>
      <progress value={completedCount} max={unitIds.length} />
    </div>
  );
}
