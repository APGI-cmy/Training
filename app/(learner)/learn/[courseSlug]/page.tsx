import { notFound } from "next/navigation";
import { CourseShell } from "@/components/course/CourseShell";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { getLearnerProgress } from "@/lib/services/progress/get-learner-progress";
import { requireSession } from "@/server/auth/session";
import { getCookieCompletedUnitIds } from "@/server/progress/progress-cookie";

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
  const course = getCourseBySlug(courseSlug);

  if (!course) {
    notFound();
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

  if (!shell) {
    notFound();
  }

  return <CourseShell shell={shell} progressMessage={progressMessage} />;
}
