import { notFound } from "next/navigation";
import { requireReviewCoursePreview } from "@/server/services/course-preview";
import { PreviewNotice } from "@/components/course/PreviewProgress";
import { PreviewKnowledge } from "@/components/course/PreviewKnowledge";
import { PreviewVersionChanged } from "@/components/course/PreviewVersionChanged";
export const dynamic="force-dynamic";
export default async function Knowledge({params}:{params:Promise<{id:string;unit:string}>}) {
  const {id,unit}=await params,{shell,preview,fresh}=await requireReviewCoursePreview(id);
  if(!fresh)return <PreviewVersionChanged id={id}/>;
  if(shell.course.slug!=="scannex-training-programme"||!shell.course.units.some(u=>u.slug===unit&&u.practicalAssessment))notFound();
  return <><PreviewNotice preview={preview}/><PreviewKnowledge reviewId={id} courseSlug={shell.course.slug} returnHref={`${preview.unitBaseHref}/${unit}`}/></>;
}
