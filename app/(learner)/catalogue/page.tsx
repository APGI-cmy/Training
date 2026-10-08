import Link from "next/link";
import { getCourses } from "@/lib/courses";
import { defaultCourseCommerceSetting, formatCoursePrice, payableCoursePriceCents } from "@/lib/commerce";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { requireSession } from "@/server/auth/session";
import { getCourseCommerceSettings } from "@/server/services/commerce/get-course-commerce";
import { getAvailableCourseIds } from "@/server/services/organisations/get-organisations";
import { CourseCardCover } from "@/components/course/CourseCardCover";

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
  const commerce = await getCourseCommerceSettings(courses.map((course) => course.slug));
  const [availableCourseIds, access] = await Promise.all([getAvailableCourseIds(session.user.id, courses.map((course) => course.id)), Promise.all(
    courses.map((course) =>
      getCourseAccess({
        accessToken: session.accessToken,
        userId: session.user.id,
        userEmail: session.user.email,
        courseId: course.id
      })
    )
  )]);
  const sourceEntries = courses.filter((course) => availableCourseIds.has(course.id)).map((course) => ({ course, decision: access[courses.indexOf(course)] }));
  const entries = view === "my-learning"
    ? getMyLearningEntries(sourceEntries)
    : getCatalogueEntries(sourceEntries);

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">{view === "my-learning" ? "Enrolled courses" : "Course catalogue"}</p>
        <h1>{view === "my-learning" ? "Your enrolled courses" : "Choose your next learning journey"}</h1>
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
          const pricing = commerce.get(course.slug) ?? defaultCourseCommerceSetting(course.slug);

          return (
            <article className="course-card course-card--visual" key={course.id}>
              <CourseCardCover courseSlug={course.slug} />
              <div className="course-card-body">
              <p className="eyebrow">{course.level}</p>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <div className="course-card-status"><p className="course-price"><strong>{formatCoursePrice(payableCoursePriceCents(pricing), pricing.currency)}</strong></p><p><strong>Status:</strong> {state}</p></div>

              {decision.status === "enrolled" ? (
                <Link className="button-link" href={`/learn/${course.slug}`}>Continue course</Link>
              ) : null}

              {decision.status === "pending" ? <p>Enrolment pending</p> : null}

              {decision.status === "not_enrolled" || decision.status === "unknown" ? (
                <Link className="button-link" href={`/courses/${course.slug}`}>Enrol now</Link>
              ) : null}

              {decision.status === "revoked" ? <p>Access revoked. Contact an administrator.</p> : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
