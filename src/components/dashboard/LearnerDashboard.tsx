import Link from "next/link";
import { ProgressIndicator } from "@/components/progress/ProgressIndicator";
import { CourseCardCover } from "@/components/course/CourseCardCover";
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
              Continue approved learning pathways, review saved course progress, and open the W3
              progress-enabled learner course shell.
            </p>
          </div>
          <ProgressIndicator
            completedUnits={dashboard.totalCompletedUnits}
            totalUnits={dashboard.totalUnits}
          />
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
              <article className="course-card course-card--visual" key={course.id}>
                <CourseCardCover courseSlug={course.slug} />
                <div className="course-card-body">
                  <span>{course.level}</span>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <div className="course-card-progress">
                    <small>{course.completedUnits} of {course.unitCount} units complete</small>
                    <progress value={course.completedUnits} max={course.unitCount || 1} />
                    <small>{course.progressPercent}% complete</small>
                  </div>
                  <Link className="primary-button" href={course.href}>
                    {course.completedUnits > 0 ? "Continue course" : "Open course"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
