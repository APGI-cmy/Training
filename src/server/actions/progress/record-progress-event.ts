"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLearningCourse } from "@/server/services/course-editions";
import { recordProgressForSession, type ProgressEventType } from "@/server/progress/record-progress";
import { markCookieUnitCompleted } from "@/server/progress/progress-cookie";
import {getCourseAccess} from "@/lib/services/enrolments/get-course-access";
import { requireSession } from "@/server/auth/session";
import {assertTigerCompletion} from '@/server/services/tiger-progression';

export async function recordProgressEvent(input: {
  courseSlug: string;
  unitSlug: string;
  eventType: ProgressEventType;
}): Promise<void> {
  const session = await requireSession();
  const course = await getLearningCourse(input.courseSlug);

  if (!course) {
    redirect("/dashboard?progress=course-not-found");
  }

  const unit = course.units.find(
    (candidate) => candidate.slug === input.unitSlug || candidate.legacySlug === input.unitSlug
  );

  if (!unit) {
    redirect(`/learn/${course.slug}?progress=unit-not-found`);
  }

  const access=await getCourseAccess({accessToken:session.accessToken,userId:session.user.id,courseId:course.id});
  if(!access.canAccess) redirect(`/learn/${course.slug}/records`);
  if (input.eventType === "unit_completed") {
    await assertTigerCompletion(session,course,unit);
    await markCookieUnitCompleted({
      userId: session.user.id,
      courseId: course.id,
      unitId: unit.id
    });
  }

  await recordProgressForSession({
    session,
    courseSlug: input.courseSlug,
    unitSlug: input.unitSlug,
    eventType: input.eventType
  });

  revalidatePath("/dashboard");
  revalidatePath(`/learn/${course.slug}`);
  revalidatePath(`/learn/${course.slug}/units/${unit.slug}`);

  const progressMessage = input.eventType === "unit_completed" ? "unit-completed" : "unit-opened";
  redirect(`/learn/${course.slug}?progress=${progressMessage}`);
}
