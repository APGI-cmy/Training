import type { UnitProgressDisplay } from "@/lib/learning-progress-display";
import "./unit-progress-breakdown.css";

export function UnitProgressBreakdown({ units, courseTitle }: { units: UnitProgressDisplay[]; courseTitle: string }) {
  const inProgress = units.filter(u => u.state === "In progress").length;
  return <details className="unit-progress-breakdown">
    <summary>View unit progress{inProgress ? ` · ${inProgress} in progress` : ""}</summary>
    <p>Videos, activities and quizzes are saved separately. A unit counts as completed only when its course requirements are met.</p>
    <ol aria-label={`${courseTitle} unit progress`}>
      {units.map(unit => <li key={unit.id}>
        <strong>Unit {unit.order}: {unit.title}</strong>
        <p><span className={`status-badge ${unit.state === "Completed" ? "status-enrolled" : ""}`}>{unit.state}</span></p>
        {unit.state !== "Unavailable" ? <ul>
          <li><strong>Video:</strong> {unit.video}</li>
          <li><strong>Activities:</strong> {unit.activities}</li>
          <li><strong>Quiz:</strong> {unit.quiz}</li>
          {unit.presentationPercent !== null && unit.state !== "Completed" ? <li>Presentation progress reported by the course: {unit.presentationPercent}%</li> : null}
        </ul> : <p>Saved progress is temporarily unavailable. No records have been changed.</p>}
      </li>)}
    </ol>
  </details>;
}

