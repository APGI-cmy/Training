import Link from "next/link";
import { getCourses } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { requireSession } from "@/server/auth/session";

export const metadata = {
  title: "Course catalogue"
};

export const dynamic = "force-dynamic";

const stateLabels = {
  enrolled: "Enrolled",
  pending: "Pending",
  not_enrolled: "Not enrolled",
  revoked: "Revoked",
  unknown: "Not enrolled"
} as const;

export default async function CataloguePage() {
  const session = await requireSession();
  const courses = getCourses();
  const access = await Promise.all(
    courses.map((course) =>
      getCourseAccess({
        accessToken: session.accessToken,
        userId: session.user.id,
        courseId: course.id
      })
    )
  );

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Course catalogue</p>
        <h1>Choose your next learning journey</h1>
        <p>Every published course is shown with your current enrolment state and the action available to you.</p>
      </header>

      <section className="course-grid" aria-label="Published courses">
        {courses.map((course, index) => {
          const decision = access[index];
          const state = stateLabels[decision.status];

          return (
            <article className="course-card" key={course.id}>
              <p className="eyebrow">{course.level}</p>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <p><strong>Status:</strong> {state}</p>

              {decision.status === "enrolled" ? (
                <Link className="button-link" href={`/learn/${course.slug}`}>Continue course</Link>
              ) : null}

              {decision.status === "pending" ? <p>Enrolment pending</p> : null}

              {decision.status === "not_enrolled" || decision.status === "unknown" ? (
                <Link className="button-link" href={`/courses/${course.slug}`}>Enrol now</Link>
              ) : null}

              {decision.status === "revoked" ? <p>Access revoked. Contact an administrator.</p> : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
