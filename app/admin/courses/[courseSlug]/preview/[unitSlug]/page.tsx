import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { encodeAssetPath } from "@/lib/courses";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
    unitSlug: string;
  }>;
};

export default async function AdminCourseUnitPreviewPage({ params }: PageProps) {
  await requireAdmin();
  const { courseSlug, unitSlug } = await params;
  const [shell, content] = [getCourseShell(courseSlug), getUnitContent(courseSlug, unitSlug)];

  if (!shell || !content) {
    notFound();
  }

  const { course, unit, previous, next, embeddedContentHref } = content;
  const previewBase = `/admin/courses/${course.slug}/preview`;
  const embeddedSrc = encodeAssetPath(embeddedContentHref ?? unit.publishedPath);

  return (
    <main className="page-shell" data-mode="preview-unit">
      <header className="page-header">
        <p className="eyebrow">Administration preview</p>
        <h1>{unit.title}</h1>
        <p>
          Viewing {course.title}. This administrator-only preview does not create learner enrolments,
          opened-unit records or progress events.
        </p>
      </header>

      <section className="content-band">
        <div className="content-inner media-stack">
          <figure className="media-item">
            <iframe title={`${unit.title} administrator preview`} src={embeddedSrc} loading="lazy" allowFullScreen />
            <figcaption>Published training content is embedded inside the governed administrator preview.</figcaption>
          </figure>

          <nav className="unit-navigation" aria-label="Administrator preview navigation">
            {previous ? (
              <Link className="secondary-button" href={`${previewBase}/${previous.slug}`}>
                Previous: {previous.title}
              </Link>
            ) : <span />}
            {next ? (
              <Link className="primary-button" href={`${previewBase}/${next.slug}`}>
                Next: {next.title}
              </Link>
            ) : null}
          </nav>
        </div>
      </section>

      <p>
        <Link href={previewBase}>Back to {course.title} preview</Link>
      </p>
    </main>
  );
}
