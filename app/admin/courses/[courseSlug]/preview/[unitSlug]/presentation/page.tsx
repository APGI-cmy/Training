import { notFound } from "next/navigation";
import { PresentationOnlyMode } from "@/components/admin/PresentationOnlyMode";
import { ScormPlayer } from "@/components/course/ScormPlayer";
import { requireAdmin } from "@/lib/auth/require-admin";
import { encodeAssetPath } from "@/lib/courses";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ courseSlug: string; unitSlug: string }> };

export default async function PresentationOnlyAdminPreview({ params }: PageProps) {
  await requireAdmin();
  const { courseSlug, unitSlug } = await params;
  const content = getUnitContent(courseSlug, unitSlug);
  if (!content) notFound();

  const { course, unit, embeddedContentHref } = content;
  const scormLaunchSrc = unit.scormPath ? encodeAssetPath(unit.scormPath) : undefined;
  const embeddedSrc = encodeAssetPath(embeddedContentHref ?? unit.publishedPath);
  const eBookHref = encodeAssetPath(unit.publishedPath);

  return (
    <PresentationOnlyMode eBookHref={eBookHref}>
      {scormLaunchSrc ? (
        <ScormPlayer courseSlug={course.slug} unitSlug={unit.slug} launchSrc={scormLaunchSrc} title={unit.title} mode="preview" />
      ) : (
        <iframe
          className="admin-presentation-only-frame"
          title={`${unit.title} presentation-only administrator preview`}
          src={embeddedSrc}
          allow="fullscreen"
          allowFullScreen
        />
      )}
    </PresentationOnlyMode>
  );
}
