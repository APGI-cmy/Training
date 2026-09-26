import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { encodeAssetPath } from "@/lib/courses";
import { ScormPlayer } from "@/components/course/ScormPlayer";
import { UnitResources } from "@/components/course/UnitResources";
import { ScannexAssessmentPreview } from "@/components/assessments/ScannexAssessmentPreview";
import { getScannexTheoryQuestions } from "@/server/assessments/scannex-theory-bank";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ courseSlug: string; unitSlug: string }> };

export default async function FullPageAdminPreview({ params }: PageProps) {
  await requireAdmin();
  const { courseSlug, unitSlug } = await params;
  const content = getUnitContent(courseSlug, unitSlug);
  if (!content) notFound();

  const { course, unit, embeddedContentHref } = content;
  const scormLaunchSrc = unit.scormPath ? encodeAssetPath(unit.scormPath) : undefined;
  const embeddedSrc = encodeAssetPath(embeddedContentHref ?? unit.publishedPath);
  const eBookHref = encodeAssetPath(unit.publishedPath);
  const previewHref = `/admin/courses/${course.slug}/preview/${unit.slug}`;

  return (
    <main className="admin-full-preview" data-mode="preview-unit-full">
      <header className="admin-full-preview-header">
        <div><p className="eyebrow">Full-page administrator preview</p><h1>{unit.title}</h1><p>{course.title} · Preview only — no learner progress, enrolment or access events are written.</p></div>
        <div className="header-actions">
          <Link className="secondary-button" href={previewHref}>Return to preview</Link>
          {!unit.practicalAssessment ? <Link className="primary-button" href={`${previewHref}/presentation`} target="_blank" rel="noreferrer">Open presentation only</Link> : null}
        </div>
      </header>
      <div className="admin-full-preview-content">
        {course.slug === "scannex-training-programme" && !unit.practicalAssessment && (
          <UnitResources eBookHref={eBookHref} activityAvailable={Boolean(scormLaunchSrc)} />
        )}
        {unit.practicalAssessment && course.slug === "scannex-training-programme" ? (
          <ScannexAssessmentPreview questions={getScannexTheoryQuestions()} />
        ) : scormLaunchSrc ? (
          <ScormPlayer courseSlug={course.slug} unitSlug={unit.slug} launchSrc={scormLaunchSrc} title={unit.title} mode="preview" />
        ) : (
          <iframe className="admin-full-preview-frame" title={`${unit.title} full-page administrator preview`} src={embeddedSrc} allow="fullscreen" allowFullScreen />
        )}
      </div>
    </main>
  );
}
