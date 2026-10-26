import { notFound } from "next/navigation";
import { requireAdminCoursePreview } from "@/server/services/course-preview";
import { PreviewNotice } from "@/components/course/PreviewProgress";
import { PreviewKnowledge } from "@/components/course/PreviewKnowledge";
export const dynamic="force-dynamic";
export default async function Knowledge({params}:{params:Promise<{courseSlug:string;unitSlug:string}>}) {
  const {courseSlug,unitSlug}=await params,{shell,preview}=await requireAdminCoursePreview(courseSlug);
  if(courseSlug!=="scannex-training-programme"||!shell.course.units.some(u=>u.slug===unitSlug&&u.practicalAssessment))notFound();
  return <><PreviewNotice preview={preview}/><PreviewKnowledge courseSlug={courseSlug} returnHref={`${preview.unitBaseHref}/${unitSlug}`}/></>;
}
