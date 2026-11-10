import { ProgressIndicator } from "@/components/progress/ProgressIndicator";
import type { CourseShell as CourseShellModel } from "@/lib/services/courses/get-course-shell";
import type { CourseResume } from "@/lib/services/progress/get-course-resume";

export function CourseShell({
  shell,
  progressMessage,
  resume
}: {
  shell: CourseShellModel;
  progressMessage?: string;
  resume?: CourseResume | null;
}) {
  const { course, units, firstUnit, completedUnits, nextAction } = shell;
  const showCompletionMessage = progressMessage === "unit-completed";

  return (
    <main>
      <section className="course-masthead">
        <div className="content-inner course-masthead-grid">
          <div>
            <a className="back-link" href="/dashboard">
              Back to dashboard
            </a>
            <p className="eyebrow">Learner course shell</p>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
            {showCompletionMessage ? (
              <p role="status">Unit marked complete. Progress has been updated.</p>
            ) : null}
            <div className="button-row">
              {resume ? <a className="primary-button" href={resume.href}>Resume last saved activity</a> : null}
              {nextAction ? (
                <a className="primary-button" href={nextAction.href}>
                  {nextAction.label}
                </a>
              ) : firstUnit ? (
                <a className="primary-button" href={firstUnit.href}>
                  Open first unit
                </a>
              ) : null}
            </div>
            {resume ? <p>Last saved activity: {resume.title}. Your place within that activity is restored when you resume.</p> : null}
          </div>
          <ProgressIndicator completedUnits={completedUnits} totalUnits={units.length} />
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner">
          <p className="eyebrow">Learning units</p>
          <h2>Choose where to continue</h2>
          <p>
            Select a learning unit or the final assessment. Required assessment results are recorded against your
            learner account.
          </p>
          <div className="unit-grid">
            {units.map((unit) => (
              <article className="unit-card" key={unit.id}>
                <div className="unit-card-header">
                  <span>{unit.kind === "summative_assessment" ? "Summative assessment" : unit.order === 0 ? "Orientation" : `Unit ${unit.order}`}</span>
                  <small>{unit.isCompleted ? "Completed" : unit.isOpened ? "Opened" : unit.duration}</small>
                </div>
                <h3>{unit.title}</h3>
                <p>{unit.subtitle}</p>
                {resume?.units[unit.id] != null ? <p>Activity progress: {resume.units[unit.id]}% saved. This is separate from the unit pass requirement.</p> : null}
                <a className="secondary-button" href={unit.href}>
                  {unit.kind === "summative_assessment"
                    ? "Open assessment"
                    : unit.isCompleted ? "Review unit" : unit.isOpened ? "Continue unit" : "Open unit"}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
