import Link from "next/link";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import type { CourseShell as CourseShellModel } from "@/lib/services/courses/get-course-shell";

export function CourseShell({ shell }: { shell: CourseShellModel }) {
  const { course, units, firstUnit } = shell;

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
            <div className="button-row">
              {firstUnit ? (
                <Link className="primary-button" href={firstUnit.href}>
                  Open first unit
                </Link>
              ) : null}
              <Link className="secondary-button" href={`/courses/${course.slug}`}>
                Open legacy course overview
              </Link>
            </div>
          </div>
          <aside className="course-progress" aria-label="Course progress placeholder">
            <span>0</span>
            <small>of {units.length} complete</small>
            <progress value={0} max={units.length || 1} />
          </aside>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner objectives-layout">
          <CourseSidebar courseSlug={course.slug} units={units} />
          <div>
            <p className="eyebrow">W2 shell status</p>
            <h2>Course structure ready</h2>
            <p>
              This shell presents seeded course metadata, a unit sidebar, and a safe handoff to the
              unit viewer. Progress remains a placeholder until W3.
            </p>
            <div className="unit-grid">
              {units.map((unit) => (
                <article className="unit-card" key={unit.id}>
                  <div className="unit-card-header">
                    <span>{unit.order === 0 ? "Orientation" : `Unit ${unit.order}`}</span>
                    <small>{unit.duration}</small>
                  </div>
                  <h3>{unit.title}</h3>
                  <p>{unit.subtitle}</p>
                  <Link className="secondary-button" href={unit.href}>
                    View unit
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
