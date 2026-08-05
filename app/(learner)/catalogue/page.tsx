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

type CatalogueProps = {
  searchParams?: Promise<{ view?: string }>;
};

type CourseEntry = {
  course: ReturnType<typeof getCourses>[number];
  decision: Awaited<ReturnType<typeof getCourseAccess>>;
};

export function getCatalogueEntries(entries: CourseEntry[]) {
  return entries;
}

export function getMyLearningEntries(entries: CourseEntry[]) {
  return entries.filter(
    ({ decision }) => decision.status !== "not_enrolled" && decision.status !== "unknown"
  );
}

export default async function CataloguePage({ searchParams }: CatalogueProps) {
  const session = await requireSession();
  const { view } = (await searchParams) ?? {};
  const courses = getCourses();
  const access = await Promise.all(
    courses.map((course) =>
      getCourseAccess({
        accessToken: session.accessToken,
        userId: session.user.id,
        userEmail: session.user.email,
        courseId: course.id
      })
    )
  );
  const sourceEntries = courses.map((course, index) => ({ course, decision: access[index] }));
  const entries = view === "my-learning"
    ? getMyLearningEntries(sourceEntries)
    : getCatalogueEntries(sourceEntries);

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">{view === "my-learning" ? "My learning" : "Course catalogue"}</p>
        <h1>{view === "my-learning" ? "Your current learning" : "Choose your next learning journey"}</h1>
        <p>
          {view === "my-learning"
            ? "Courses with an enrolled, pending, or revoked relationship are shown here."
            : "Every published course is shown with your current enrolment state and the action available to you."}
        </p>
      </header>

      <section className="course-grid" aria-label={view === "my-learning" ? "My learning courses" : "Published courses"}>
        {entries.length === 0 ? <p>No courses are currently linked to your learning profile.</p> : null}
        {entries.map(({ course, decision }) => {
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
