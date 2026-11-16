import { notFound,redirect } from "next/navigation";
import {tigerUnitAllowed} from '@/server/services/tiger-progression';
import {tigerCompletedUnits} from '@/server/services/tiger-progression';
import {isTigerCourse} from '@/lib/tiger-progression';
import { CourseAccessDenied } from "@/components/course/CourseAccessDenied";
import { UnitViewer } from "@/components/course/UnitViewer";
import { ViewerUnitAccess } from "@/components/course/ViewerUnitAccess";
import { getLearningCourse } from "@/server/services/course-editions";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getLearnerProgress } from "@/lib/services/progress/get-learner-progress";
import { requireSession } from "@/server/auth/session";
import { getCookieCompletedUnitIds } from "@/server/progress/progress-cookie";
import { evaluateViewerLabAvailability, getViewerLabSettings } from "@/lib/services/viewer-lab/viewer-lab-settings";
import { reviewEbook } from "@/server/services/review-resources";

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
  const course = await getLearningCourse(courseSlug);

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

  if(!isTigerCourse(course))cookieCompletedUnitIds.forEach((unitId) => {
    progress.completedUnitIds.add(unitId);
    progress.openedUnitIds.add(unitId);
  });

  if(isTigerCourse(course))progress.completedUnitIds=(await tigerCompletedUnits(session,course))!;
  const shell = getCourseShell(courseSlug, progress, course);
  const content = getUnitContent(courseSlug, unitSlug, course);

  if (!shell || !content) {
    notFound();
  }

  if(!await tigerUnitAllowed(session,course,content.unit))redirect(`/learn/${course.slug}?progress=requirements`);
  const viewerAvailability = course.slug === "scannex-training-programme"
    ? evaluateViewerLabAvailability(await getViewerLabSettings(), content.unit.slug)
    : undefined;

  return <ViewerUnitAccess userId={session.user.id} courseSlug={course.slug} unitSlug={content.unit.slug}>
    <UnitViewer content={content} units={shell.units} viewerAvailability={viewerAvailability} referenceEbook={reviewEbook(content.unit)} />
  </ViewerUnitAccess>;
}
