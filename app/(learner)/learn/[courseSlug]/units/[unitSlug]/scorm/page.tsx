import { notFound,redirect } from "next/navigation";
import {tigerUnitAllowed} from '@/server/services/tiger-progression';
import { LearningActivity } from "@/components/course/LearningActivity";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { ViewerUnitAccess } from "@/components/course/ViewerUnitAccess";
import { getLearningCourse } from "@/server/services/course-editions";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { requireSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ courseSlug: string; unitSlug: string }> };

export default async function ScormLaunchPage({ params }: PageProps) {
  const session = await requireSession();
  const { courseSlug, unitSlug } = await params;
  const course = await getLearningCourse(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug || candidate.legacySlug === unitSlug);
  if (!course || !unit?.scormPath) notFound();

  const access = await getCourseAccess({
    accessToken: session.accessToken,
    userId: session.user.id,
    userEmail: session.user.email,
    courseId: course.id
  });
  if (!access.canAccess) notFound();
  if(!await tigerUnitAllowed(session,course,unit))redirect(`/learn/${course.slug}?progress=requirements`);
  const content = getUnitContent(courseSlug, unitSlug, course);
  if (!content) notFound();

  return (
    <ViewerUnitAccess userId={session.user.id} courseSlug={course.slug} unitSlug={unit.slug}>
    <LearningActivity content={content}/>
    </ViewerUnitAccess>
  );
}
