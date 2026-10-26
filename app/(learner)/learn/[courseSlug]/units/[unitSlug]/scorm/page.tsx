import { notFound } from "next/navigation";
import { LearningActivity } from "@/components/course/LearningActivity";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { ViewerUnitAccess } from "@/components/course/ViewerUnitAccess";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { requireSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ courseSlug: string; unitSlug: string }> };

export default async function ScormLaunchPage({ params }: PageProps) {
  const session = await requireSession();
  const { courseSlug, unitSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug || candidate.legacySlug === unitSlug);
  if (!course || !unit?.scormPath) notFound();

  const access = await getCourseAccess({
    accessToken: session.accessToken,
    userId: session.user.id,
    userEmail: session.user.email,
    courseId: course.id
  });
  if (!access.canAccess) notFound();
  const content = getUnitContent(courseSlug, unitSlug);
  if (!content) notFound();

  return (
    <ViewerUnitAccess userId={session.user.id} courseSlug={course.slug} unitSlug={unit.slug}>
    <LearningActivity content={content}/>
    </ViewerUnitAccess>
  );
}
