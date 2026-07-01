"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCourseBySlug } from "@/lib/courses";
import { recordProgressForSession, type ProgressEventType } from "@/server/progress/record-progress";
import { markCookieUnitCompleted } from "@/server/progress/progress-cookie";
import { requireSession } from "@/server/auth/session";

export async function recordProgressEvent(input: {
  courseSlug: string;
  unitSlug: string;
  eventType: ProgressEventType;
}): Promise<void> {
  const session = await requireSession();
  const course = getCourseBySlug(input.courseSlug);

  if (!course) {
    redirect("/dashboard?progress=course-not-found");
  }

  const unit = course.units.find(
    (candidate) => candidate.slug === input.unitSlug || candidate.legacySlug === input.unitSlug
  );

  if (!unit) {
    redirect(`/learn/${course.slug}?progress=unit-not-found`);
  }

  if (input.eventType === "unit_completed") {
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

  redirect(`/learn/${course.slug}?progress=unit-completed`);
}
