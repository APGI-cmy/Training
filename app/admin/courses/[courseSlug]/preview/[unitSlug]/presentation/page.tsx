import { notFound } from "next/navigation";
import { PresentationOnlyMode } from "@/components/admin/PresentationOnlyMode";
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

  const { unit, embeddedContentHref } = content;
  const embeddedSrc = encodeAssetPath(embeddedContentHref ?? unit.publishedPath);

  return <PresentationOnlyMode><iframe className="admin-presentation-only-frame" title={`${unit.title} presentation-only administrator preview`} src={embeddedSrc} allowFullScreen /></PresentationOnlyMode>;
}
