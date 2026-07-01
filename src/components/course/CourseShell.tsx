import Link from "next/link";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { ProgressIndicator } from "@/components/progress/ProgressIndicator";
import type { CourseShell as CourseShellModel } from "@/lib/services/courses/get-course-shell";

export function CourseShell({
  shell,
  progressMessage
}: {
  shell: CourseShellModel;
  progressMessage?: string;
}) {
  const { course, units, firstUnit, completedUnits, nextAction } = shell;
  const showCompletionMessage = progressMessage === "unit-completed";

  return (
    <main>
      <section className="course-masthead">
        <div className="content-inner course-masthead-grid">
          <div>
            <Link className="back-link" href="/dashboard">
              Back to dashboard
            </Link>
            <p className="eyebrow">Learner course shell</p>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
            {showCompletionMessage ? (
              <p role="status">Unit marked complete. Progress has been updated.</p>
            ) : null}
            <div className="button-row">
              {nextAction ? (
                <Link className="primary-button" href={nextAction.href}>
                  {nextAction.label}
                </Link>
              ) : firstUnit ? (
                <Link className="primary-button" href={firstUnit.href}>
                  Open first unit
                </Link>
              ) : null}
              <Link className="secondary-button" href={`/courses/${course.slug}`}>
                Open legacy course overview
              </Link>
            </div>
          </div>
          <ProgressIndicator completedUnits={completedUnits} totalUnits={units.length} />
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner objectives-layout">
          <CourseSidebar courseSlug={course.slug} units={units} />
          <div>
            <p className="eyebrow">W3 progress status</p>
            <h2>Course progress ready</h2>
            <p>
              This shell now presents saved learner progress, unit status, and a safe handoff to the
              next learning action.
            </p>
            <div className="unit-grid">
              {units.map((unit) => (
                <article className="unit-card" key={unit.id}>
                  <div className="unit-card-header">
                    <span>{unit.order === 0 ? "Orientation" : `Unit ${unit.order}`}</span>
                    <small>{unit.isCompleted ? "Completed" : unit.isOpened ? "Opened" : unit.duration}</small>
                  </div>
                  <h3>{unit.title}</h3>
                  <p>{unit.subtitle}</p>
                  <Link className="secondary-button" href={unit.href}>
                    {unit.isCompleted ? "Review unit" : unit.isOpened ? "Continue unit" : "View unit"}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
