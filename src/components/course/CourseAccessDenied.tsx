import Link from "next/link";
import type { CourseAccessDecision } from "@/lib/services/enrolments/get-course-access";
import type { Course } from "@/types/course";

export function CourseAccessDenied({
  course,
  access
}: {
  course: Course;
  access: CourseAccessDecision;
}) {
  const statusLabel = access.status.replace("_", " ");

  return (
    <main>
      <section className="course-masthead">
        <div className="content-inner">
          <Link className="back-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">W4 enrolment access gate</p>
          <h1>Course access pending</h1>
          <p>
            {course.title} is available only when your enrolment status grants access to this course.
          </p>
          <p role="status">Current enrolment status: {statusLabel}.</p>
          <p>{access.reason}</p>
          <div className="button-row">
            <Link className="primary-button" href={`/courses/${course.slug}`}>
              View course overview
            </Link>
            <Link className="secondary-button" href="/dashboard">
              Return to dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
