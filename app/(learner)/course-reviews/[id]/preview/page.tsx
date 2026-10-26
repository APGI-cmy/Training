import { requireReviewCoursePreview } from "@/server/services/course-preview";
import { PreviewCourseHome, PreviewNotice } from "@/components/course/PreviewProgress";
import { PreviewVersionChanged } from "@/components/course/PreviewVersionChanged";
export const dynamic = "force-dynamic";
export default async function ReviewCoursePreview({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const {shell,preview,fresh}=await requireReviewCoursePreview(id);
  if(!fresh)return <PreviewVersionChanged id={id}/>;
  return <><PreviewNotice preview={preview}/><PreviewCourseHome shell={shell} preview={preview}/></>;
}
