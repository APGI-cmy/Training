import type { ReactNode } from "react";

export async function ViewerUnitAccess({ userId, courseSlug, unitSlug, children }: {
  userId: string; courseSlug: string; unitSlug: string; children: ReactNode;
}) {
  // Enrolment is checked by the page. An AWS session is independent of course
  // navigation: learners may read any LU while their Viewer remains open.
  return children;
}
