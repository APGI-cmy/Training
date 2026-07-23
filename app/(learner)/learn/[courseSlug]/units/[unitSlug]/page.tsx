import { notFound } from "next/navigation";
import { CourseAccessDenied } from "@/components/course/CourseAccessDenied";
import { UnitViewer } from "@/components/course/UnitViewer";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getLearnerProgress } from "@/lib/services/progress/get-learner-progress";
import { requireSession } from "@/server/auth/session";
import { getCookieCompletedUnitIds } from "@/server/progress/progress-cookie";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
    unitSlug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const session = await requireSession();
  const { courseSlug, unitSlug } = await params;
  const course = getCourseBySlug(courseSlug);

  if (!course) {
    notFound();
  }

  const access = await getCourseAccess({
    accessToken: session.accessToken,
    userId: session.user.id,
    userEmail: session.user.email,
    courseId: course.id
  });

  if (!access.canAccess) {
    return <CourseAccessDenied course={course} access={access} />;
  }

  const [progress, cookieCompletedUnitIds] = await Promise.all([
    getLearnerProgress({
      accessToken: session.accessToken,
      userId: session.user.id,
      courseId: course.id
    }),
    getCookieCompletedUnitIds({
      userId: session.user.id,
      courseId: course.id
    })
  ]);

  cookieCompletedUnitIds.forEach((unitId) => {
    progress.completedUnitIds.add(unitId);
    progress.openedUnitIds.add(unitId);
  });

  const shell = getCourseShell(courseSlug, progress);
  const content = getUnitContent(courseSlug, unitSlug);

  if (!shell || !content) {
    notFound();
  }

  return <UnitViewer content={content} units={shell.units} />;
}
