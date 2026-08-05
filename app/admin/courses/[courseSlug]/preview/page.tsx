import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
  }>;
};

export default async function AdminCoursePreviewPage({ params }: PageProps) {
  await requireAdmin();
  const { courseSlug } = await params;
  const shell = getCourseShell(courseSlug);

  if (!shell) {
    notFound();
  }

  const { course, units } = shell;

  return (
    <main className="page-shell" data-mode="preview">
      <header className="page-header">
        <p className="eyebrow">Administration preview</p>
        <h1>{course.title}</h1>
        <p>
          This preview is role-gated for administrators and reads course content without creating
          learner enrolments or progress records.
        </p>
      </header>

      <section className="course-grid" aria-label={`${course.title} preview units`}>
        {units.map((unit) => (
          <article className="course-card" key={unit.id}>
            <p className="eyebrow">{unit.order === 0 ? "Orientation" : `Unit ${unit.order}`}</p>
            <h2>{unit.title}</h2>
            <p>{unit.subtitle}</p>
            <Link
              className="button-link"
              href={`/admin/courses/${course.slug}/preview/${unit.slug}`}
            >
              Open preview
            </Link>
          </article>
        ))}
      </section>

      <p>
        <Link href="/admin/courses">Back to course previews</Link>
      </p>
    </main>
  );
}
