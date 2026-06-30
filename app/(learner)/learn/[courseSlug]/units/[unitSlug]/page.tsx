import { notFound } from "next/navigation";
import { UnitViewer } from "@/components/course/UnitViewer";
import { requireSession } from "@/server/auth/session";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
    unitSlug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireSession();

  const { courseSlug, unitSlug } = await params;
  const shell = getCourseShell(courseSlug);
  const content = getUnitContent(courseSlug, unitSlug);

  if (!shell || !content) {
    notFound();
  }

  return <UnitViewer content={content} units={shell.units} />;
}