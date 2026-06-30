"use server";

import { revalidatePath } from "next/cache";
import { getCourseBySlug } from "@/lib/courses";
import { recordProgressForSession, type ProgressEventType } from "@/server/progress/record-progress";
import { requireSession } from "@/server/auth/session";

export async function recordProgressEvent(input: {
  courseSlug: string;
  unitSlug: string;
  eventType: ProgressEventType;
}): Promise<void> {
  const session = await requireSession();
  await recordProgressForSession({
    session,
    courseSlug: input.courseSlug,
    unitSlug: input.unitSlug,
    eventType: input.eventType
  });

  const course = getCourseBySlug(input.courseSlug);

  if (!course) {
    return;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/learn/${course.slug}`);
  revalidatePath(`/learn/${course.slug}/units/${input.unitSlug}`);
}
