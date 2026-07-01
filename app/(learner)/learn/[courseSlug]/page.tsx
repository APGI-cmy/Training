import { notFound } from "next/navigation";
import { CourseShell } from "@/components/course/CourseShell";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { getLearnerProgress } from "@/lib/services/progress/get-learner-progress";
import { requireSession } from "@/server/auth/session";

export const metadata = {
  title: "Course shell"
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const session = await requireSession();
  const { courseSlug } = await params;
  const course = getCourseBySlug(courseSlug);

  if (!course) {
    notFound();
  }

  const progress = await getLearnerProgress({
    accessToken: session.accessToken,
    userId: session.user.id,
    courseId: course.id
  });
  const shell = getCourseShell(courseSlug, progress);

  if (!shell) {
    notFound();
  }

  return <CourseShell shell={shell} />;
}
