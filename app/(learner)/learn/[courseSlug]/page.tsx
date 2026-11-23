import {tigerCompletedUnits} from '@/server/services/tiger-progression';
import {isTigerCourse} from '@/lib/tiger-progression';
import { notFound } from "next/navigation";
import { CourseAccessDenied } from "@/components/course/CourseAccessDenied";
import { CourseShell } from "@/components/course/CourseShell";
import { getLearningCourse } from "@/server/services/course-editions";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getLearnerProgress } from "@/lib/services/progress/get-learner-progress";
import { requireSession } from "@/server/auth/session";
import { getCookieCompletedUnitIds } from "@/server/progress/progress-cookie";
import {loadProgressDisplayEvidence} from "@/server/services/learning-progress-display";
import {overallLearningProgress, unitProgressDisplay} from "@/lib/learning-progress-display";

export const metadata = {
  title: "Course shell"
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
  }>;
  searchParams?: Promise<{
    progress?: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const session = await requireSession();
  const { courseSlug } = await params;
  const { progress: progressMessage } = (await searchParams) ?? {};
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

  if(isTigerCourse(course)){
    progress.completedUnitIds=(await tigerCompletedUnits(session,course))!;
  }
  const shell = getCourseShell(courseSlug, progress, course);

  if (!shell) {
    notFound();
  }

  const displayEvidence = await loadProgressDisplayEvidence([session.user.id]);
  shell.overallProgressPercent = overallLearningProgress(unitProgressDisplay(course, session.user.id, displayEvidence, progress.completedUnitIds, true));
  return <CourseShell shell={shell} progressMessage={progressMessage} />;
}
