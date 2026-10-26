"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { recordProgressForSession } from "@/server/progress/record-progress";
import { markCookieUnitCompleted } from "@/server/progress/progress-cookie";

export type AdvanceUnitState = { error?: string };

export async function completeVpshrAndContinue(
  input: { courseSlug: string; unitSlug: string },
  _previous: AdvanceUnitState,
  _form: FormData
): Promise<AdvanceUnitState> {
  const session = await requireSession();
  const content = getUnitContent(input.courseSlug, input.unitSlug);
  if (!content || content.course.id !== "vpshr-level-0" || content.unit.scormPath || content.unit.practicalAssessment) return { error: "This unit does not use completion on Next." };
  const { course, unit, next } = content;
  try {
    const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, userEmail: session.user.email, courseId: course.id });
    if (!access.canAccess) return { error: "Your course access could not be confirmed. Sign in with your enrolled account and try again." };
    await recordProgressForSession({ session, courseSlug: course.slug, unitSlug: unit.slug, eventType: "unit_completed", requirePersistence: true });
    await markCookieUnitCompleted({ userId: session.user.id, courseId: course.id, unitId: unit.id });
  } catch {
    return { error: "Completion could not be saved. Stay on this unit and select Next again." };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/learn/${course.slug}`);
  revalidatePath(`/learn/${course.slug}/units/${unit.slug}`);
  redirect(next ? `/learn/${course.slug}/units/${next.slug}` : `/learn/${course.slug}?progress=unit-completed`);
}
