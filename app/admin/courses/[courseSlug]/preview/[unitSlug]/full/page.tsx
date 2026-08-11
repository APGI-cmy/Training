import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { encodeAssetPath } from "@/lib/courses";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ courseSlug: string; unitSlug: string }> };

export default async function FullPageAdminPreview({ params }: PageProps) {
  await requireAdmin();
  const { courseSlug, unitSlug } = await params;
  const content = getUnitContent(courseSlug, unitSlug);
  if (!content) notFound();

  const { course, unit, embeddedContentHref } = content;
  const embeddedSrc = encodeAssetPath(embeddedContentHref ?? unit.publishedPath);
  const previewHref = `/admin/courses/${course.slug}/preview/${unit.slug}`;

  return (
    <main className="admin-full-preview" data-mode="preview-unit-full">
      <header className="admin-full-preview-header">
        <div><p className="eyebrow">Full-page administrator preview</p><h1>{unit.title}</h1><p>{course.title} · Preview only — no learner progress, enrolment or access events are written.</p></div>
        <Link className="secondary-button" href={previewHref}>Return to preview</Link>
      </header>
      <iframe className="admin-full-preview-frame" title={`${unit.title} full-page administrator preview`} src={embeddedSrc} allowFullScreen />
    </main>
  );
}
