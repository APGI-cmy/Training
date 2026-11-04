import {isPlatformPrincipal} from '@/server/services/platform-principals';
import {getSavedCourseCardImages} from '@/server/services/course-card-images';
import Link from "next/link";
import { getCourses } from "@/lib/courses";
import { defaultCourseCommerceSetting, formatCoursePrice, payableCoursePriceCents } from "@/lib/commerce";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { requireSession } from "@/server/auth/session";
import { getCourseCommerceSettings } from "@/server/services/commerce/get-course-commerce";
import { getAvailableCourseIds } from "@/server/services/organisations/get-organisations";
import { CourseCardCover } from "@/components/course/CourseCardCover";
import styles from "@/components/course/compact-course-catalogue.module.css";
import { requireLearnerProfile } from "@/server/auth/learner-onboarding";
import { getCatalogueReviews } from "@/server/services/organisations/get-catalogue-reviews";
import { CatalogueReviewCard } from "@/components/course/CatalogueReviewCard";

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
  await requireLearnerProfile(session);
  const { view } = (await searchParams) ?? {};
  const principal=view!=="my-learning"&&await isPlatformPrincipal(session);
  const courses = getCourses();
 const cardImages=await getSavedCourseCardImages();
  const commerce = await getCourseCommerceSettings(courses.map((course) => course.slug));
  const [availableCourseIds, access, reviews] = await Promise.all([getAvailableCourseIds(session.user.id, courses.map((course) => course.id)), Promise.all(
    courses.map((course) =>
      getCourseAccess({
        accessToken: session.accessToken,
        userId: session.user.id,
        userEmail: session.user.email,
        courseId: course.id
      })
    )
  ),view==="my-learning"?Promise.resolve(new Map()):getCatalogueReviews(session,courses.map(course=>course.id))]);
  const sourceEntries = courses.filter((course) => availableCourseIds.has(course.id)).map((course) => ({ course, decision: access[courses.indexOf(course)] }));
  const entries = view === "my-learning"
    ? getMyLearningEntries(sourceEntries)
    : getCatalogueEntries(sourceEntries);
  const adminPreviews=view==="my-learning"||!principal?[]:courses.filter(c=>!availableCourseIds.has(c.id)&&!reviews.has(c.id));
  const reviewCourses=view==="my-learning"?[]:courses.filter(course=>!availableCourseIds.has(course.id)&&reviews.has(course.id));

  return (
    <main className={`page-shell ${styles.page}`}>
      <header className={`page-header ${styles.header}`}>
        <p className="eyebrow">{view === "my-learning" ? "Enrolled courses" : "Course catalogue"}</p>
        <h1>{view === "my-learning" ? "Your enrolled courses" : "Choose your next learning journey"}</h1>
        <p>
          {view === "my-learning"
            ? "Courses with an enrolled, pending, or revoked relationship are shown here."
            : "Browse available courses and any private courses you are authorised to review. Courses under review open in the review workspace until publication is complete."}
        </p>
      </header>

      <section className={`course-grid ${styles.grid}`} aria-label={view === "my-learning" ? "My learning courses" : "Available courses and assigned reviews"}>
        {entries.length === 0 && reviewCourses.length===0 && adminPreviews.length===0 ? <p>No courses are currently linked to your learning profile.</p> : null}
        {entries.map(({ course, decision }) => {
          const state = stateLabels[decision.status];
          const pricing = commerce.get(course.slug) ?? defaultCourseCommerceSetting(course.slug);

          return (
            <article className={`course-card course-card--visual ${styles.card}`} key={course.id}>
              <CourseCardCover courseSlug={course.slug} cover={cardImages[course.slug]} />
              <div className="course-card-body">
              <p className="eyebrow">{course.level}</p>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <div className="course-card-status"><p className="course-price"><strong>{course.pricing === "company_agreement" ? "Price set in your company agreement" : formatCoursePrice(payableCoursePriceCents(pricing), pricing.currency)}</strong></p><p><strong>Status:</strong> {state}</p></div>

              {decision.status === "enrolled" ? (
                <Link className="button-link" href={`/learn/${course.slug}`}>Continue course</Link>
              ) : null}

              {decision.status === "pending" ? <p>Enrolment pending</p> : null}

              {decision.status === "not_enrolled" || decision.status === "unknown" ? (
                <Link className="button-link" href={`/courses/${course.slug}`}>Enrol now</Link>
              ) : null}

              {decision.status === "revoked" ? <p>Access revoked. Contact an administrator.</p> : null}
              {reviews.has(course.id) ? <Link className="button-link" href={`/course-reviews/${reviews.get(course.id)!.id}/preview`}>Preview as learner</Link> : null}
              </div>
            </article>
          );
        })}
        {adminPreviews.map(course=><article className={`course-card course-card--visual ${styles.card}`} key={course.id}><CourseCardCover courseSlug={course.slug} cover={cardImages[course.slug]}/><div className="course-card-body"><p className="eyebrow">{course.level}</p><h2>{course.title}</h2><p>{course.description}</p><p><strong>Status: Administrator preview</strong><br/>Not yet available for learner enrolment.</p><Link className="button-link" href={`/admin/courses/${course.slug}/preview`}>Preview course</Link><Link className="button-link" href={`/course-reviews/new?course=${course.slug}`}>Start publication workflow</Link></div></article>)}
        {reviewCourses.map(course=><CatalogueReviewCard key={course.id} course={course} review={reviews.get(course.id)!} cover={cardImages[course.slug]}/>)}
      </section>
    </main>
  );
}
