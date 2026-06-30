import { notFound } from "next/navigation";
import { UnitViewer } from "@/components/course/UnitViewer";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { getLearnerProgress } from "@/lib/services/progress/get-learner-progress";
import { recordProgressEvent } from "@/server/actions/progress/record-progress-event";
import { requireSession } from "@/server/auth/session";

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

  await recordProgressEvent({
    courseSlug,
    unitSlug,
    eventType: "unit_opened"
  });

  const progress = await getLearnerProgress({
    accessToken: session.accessToken,
    userId: session.user.id,
    courseId: course.id
  });
  const shell = getCourseShell(courseSlug, progress);
  const content = getUnitContent(courseSlug, unitSlug);

  if (!shell || !content) {
    notFound();
  }

  return <UnitViewer content={content} units={shell.units} />;
}
