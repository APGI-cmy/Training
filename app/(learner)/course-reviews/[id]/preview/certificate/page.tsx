import { requireReviewCoursePreview } from "@/server/services/course-preview";
import { PreviewNotice } from "@/components/course/PreviewProgress";
import { PreviewCourseCertificate } from "@/components/course/PreviewCourseCertificate";
import { PreviewVersionChanged } from "@/components/course/PreviewVersionChanged";
export const dynamic="force-dynamic";
export default async function Certificate({params}:{params:Promise<{id:string}>}) {
  const {id}=await params,{shell,preview,fresh}=await requireReviewCoursePreview(id);
  if(!fresh)return <PreviewVersionChanged id={id}/>;
  return <><PreviewNotice preview={preview}/><PreviewCourseCertificate shell={shell} preview={preview}/></>;
}
