"use client";

import { useEffect, useState } from "react";
import type { LearningUnit } from "@/types/course";

interface ProgressTrackerProps {
  unit: LearningUnit;
}

export function ProgressTracker({ unit }: ProgressTrackerProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState<string | null>(null);
  const progressKey = `apgi-training-progress-${unit.id}`;
  const scoreKey = `apgi-training-score-${unit.id}`;

  useEffect(() => {
    setIsComplete(window.localStorage.getItem(progressKey) === "complete");
    setScore(window.localStorage.getItem(scoreKey));
  }, [progressKey, scoreKey]);

  function toggleCompletion() {
    const nextState = !isComplete;
    setIsComplete(nextState);

    if (nextState) {
      window.localStorage.setItem(progressKey, "complete");
    } else {
      window.localStorage.removeItem(progressKey);
    }
  }

  return (
    <aside className="progress-panel" aria-label="Progress">
      <div>
        <p className="eyebrow">Progress</p>
        <h2>{isComplete ? "Marked complete" : "In progress"}</h2>
        <p>{score ? `Latest quiz score: ${score}` : "Quiz score appears after submission."}</p>
      </div>
      <button className="secondary-button" type="button" onClick={toggleCompletion}>
        {isComplete ? "Reset completion" : "Mark complete"}
      </button>
    </aside>
  );
}
