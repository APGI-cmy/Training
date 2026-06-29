import { notFound } from "next/navigation";
import { UnitViewer } from "@/components/course/UnitViewer";
import { requireSession } from "@/server/auth/session";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    unitSlug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireSession();
  const { unitSlug } = await params;
  const shell = getCourseShell("vpshr-level-0");
  const content = getUnitContent("vpshr-level-0", unitSlug);

  if (!shell || !content) {
    notFound();
  }

  return <UnitViewer content={content} units={shell.units} />;
}
