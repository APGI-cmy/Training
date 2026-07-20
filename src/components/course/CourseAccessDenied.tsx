import Link from "next/link";
import { SignOutControl } from "@/components/auth/sign-out-control";
import type { CourseAccessDecision } from "@/lib/services/enrolments/get-course-access";
import type { Course } from "@/types/course";

function deniedHeading(status: CourseAccessDecision["status"]): string {
  if (status === "pending") {
    return "Course access pending";
  }

  if (status === "revoked") {
    return "Course access revoked";
  }

  if (status === "unknown") {
    return "Course access unavailable";
  }

  return "Course access required";
}

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
          <p className="eyebrow">W4 enrolment access gate</p>
          <h1>{deniedHeading(access.status)}</h1>
          <p>
            {course.title} is available only when your enrolment status grants access to this course.
          </p>
          <p role="status">Current enrolment status: {statusLabel}.</p>
          <p>{access.reason}</p>
          <div className="button-row" aria-label="Course access recovery actions">
            <Link className="primary-button" href="/dashboard">
              Return to dashboard
            </Link>
            <Link className="secondary-button" href="/profile">
              Open profile
            </Link>
            <Link className="secondary-button" href="/courses/vpshr-level-0">
              Open public course landing
            </Link>
            <SignOutControl />
          </div>
        </div>
      </section>
    </main>
  );
}
