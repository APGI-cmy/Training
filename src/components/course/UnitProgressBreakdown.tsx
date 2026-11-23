import { OVERALL_PROGRESS_HELP, type UnitProgressDisplay } from "@/lib/learning-progress-display";
import "./unit-progress-breakdown.css";

export function UnitProgressBreakdown({ units, courseTitle }: { units: UnitProgressDisplay[]; courseTitle: string }) {
  const inProgress = units.filter(u => u.state === "In progress").length;
  return <details className="unit-progress-breakdown">
    <summary>View unit progress{inProgress ? ` · ${inProgress} in progress` : ""}</summary>
    <p>Videos, activities and quizzes are saved separately. A unit counts as completed only when its course requirements are met.</p>
    <p>{OVERALL_PROGRESS_HELP}</p>
    <ol aria-label={`${courseTitle} unit progress`}>
      {units.map(unit => <li key={unit.id}>
        <details open={unit.state === "In progress"}>
        <summary><strong>Unit {unit.order}: {unit.title}</strong> · {unit.state}</summary>
        {unit.state !== "Unavailable" ? <ul>
          <li><strong>Video:</strong> {unit.video}</li>
          <li><strong>Activities:</strong> {unit.activities}</li>
          <li><strong>Quiz:</strong> {unit.quiz}</li>
          {unit.presentationPercent !== null && unit.state !== "Completed" ? <li>Presentation progress reported by the course: {unit.presentationPercent}%</li> : null}
        </ul> : <p>Saved progress is temporarily unavailable. No records have been changed.</p>}
        </details>
      </li>)}
    </ol>
  </details>;
}

