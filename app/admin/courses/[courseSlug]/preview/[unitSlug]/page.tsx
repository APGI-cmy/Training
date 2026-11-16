import { notFound } from "next/navigation";
import { requireAdminCoursePreview } from "@/server/services/course-preview";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { UnitViewer } from "@/components/course/UnitViewer";
import { PreviewNotice } from "@/components/course/PreviewProgress";
import { reviewEbook } from "@/server/services/review-resources";
import { evaluateViewerLabAvailability, getViewerLabSettings } from "@/lib/services/viewer-lab/viewer-lab-settings";
export const dynamic = "force-dynamic";
export default async function AdminCourseUnitPreviewPage({params}:{params:Promise<{courseSlug:string;unitSlug:string}>}) {
  const {courseSlug,unitSlug}=await params;
  const {shell,preview}=await requireAdminCoursePreview(courseSlug);
  const content=getUnitContent(courseSlug,unitSlug);if(!content)notFound();
  const viewerAvailability=courseSlug==="scannex-training-programme"?evaluateViewerLabAvailability(await getViewerLabSettings(),content.unit.slug):undefined;
  return <><PreviewNotice preview={preview}/><UnitViewer key={`${preview.scope}:${content.unit.slug}`} content={content} units={shell.units} preview={preview} referenceEbook={reviewEbook(content.unit)} viewerAvailability={viewerAvailability}/></>;
}
