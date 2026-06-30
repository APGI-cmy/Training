import { notFound } from "next/navigation";
import { CourseShell } from "@/components/course/CourseShell";
import { requireSession } from "@/server/auth/session";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";

export const metadata = {
  title: "Course shell"
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireSession();

  const { courseSlug } = await params;
  const shell = getCourseShell(courseSlug);

  if (!shell) {
    notFound();
  }

  return <CourseShell shell={shell} />;
}