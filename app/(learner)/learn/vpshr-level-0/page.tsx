import { CourseShell } from "@/components/course/CourseShell";
import { requireSession } from "@/server/auth/session";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";

export const metadata = {
  title: "VPSHR Level 0 course shell"
};

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireSession();
  const shell = getCourseShell("vpshr-level-0");

  if (!shell) {
    return null;
  }

  return <CourseShell shell={shell} />;
}
