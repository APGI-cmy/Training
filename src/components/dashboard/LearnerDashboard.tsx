import Link from "next/link";
import type { LearnerDashboard as LearnerDashboardModel } from "@/lib/services/dashboard/get-dashboard";

export function LearnerDashboard({ dashboard }: { dashboard: LearnerDashboardModel }) {
  return (
    <main>
      <section className="page-masthead">
        <div className="content-inner course-masthead-grid">
          <div>
            <p className="eyebrow">Learner dashboard</p>
            <h1>Your APGI learning dashboard</h1>
            <p>
              Continue approved learning pathways, review course progress placeholders, and open the
              W2 learner course shell.
            </p>
          </div>
          <aside className="course-progress" aria-label="Dashboard summary">
            <span>{dashboard.totalCompletedUnits}</span>
            <small>of {dashboard.totalUnits} units complete</small>
            <progress value={dashboard.totalCompletedUnits} max={dashboard.totalUnits || 1} />
          </aside>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Assigned courses</p>
              <h2>Available learning pathways</h2>
            </div>
          </div>
          <div className="card-grid">
            {dashboard.courses.map((course) => (
              <article className="course-card" key={course.id}>
                <span>{course.level}</span>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <small>{course.completedUnits} of {course.unitCount} units complete</small>
                <progress value={course.completedUnits} max={course.unitCount || 1} />
                <Link className="primary-button" href={course.href}>
                  Open course shell
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
