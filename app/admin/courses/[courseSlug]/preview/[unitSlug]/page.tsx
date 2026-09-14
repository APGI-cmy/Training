import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { encodeAssetPath } from "@/lib/courses";
import { ScormPlayer } from "@/components/course/ScormPlayer";
import { UnitResources } from "@/components/course/UnitResources";
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
  const scormLaunchSrc = unit.scormPath ? encodeAssetPath(unit.scormPath) : undefined;
  const embeddedSrc = encodeAssetPath(embeddedContentHref ?? unit.publishedPath);
  const eBookHref = encodeAssetPath(unit.publishedPath);

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
          <div className="preview-toolbar">
            <p>Use the same learning resources and navigation that learners receive. This preview never writes learner progress.</p>
            <div className="header-actions">
              <Link className="primary-button" href={`${previewBase}/${unit.slug}/full`}>Open full-page preview</Link>
            </div>
          </div>
          {course.slug === "scannex-training-programme" && (
            <UnitResources
              eBookHref={eBookHref}
              activityHref={scormLaunchSrc ? `${previewBase}/${unit.slug}/full` : undefined}
              activityAvailable={Boolean(scormLaunchSrc)}
              activityLabel="Open learning activity in a full-page preview"
            />
          )}
          {scormLaunchSrc ? (
            <ScormPlayer courseSlug={course.slug} unitSlug={unit.slug} launchSrc={scormLaunchSrc} title={unit.title} mode="preview" />
          ) : (
            <figure className="media-item">
              <iframe title={`${unit.title} administrator preview`} src={embeddedSrc} loading="lazy" allow="fullscreen" allowFullScreen />
              <figcaption>Published e-book is embedded inside the governed administrator preview. The learning activity will replace this view once its SCORM package is verified.</figcaption>
            </figure>
          )}

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
