import { requireReviewCoursePreview } from "@/server/services/course-preview";
import { PreviewNotice } from "@/components/course/PreviewProgress";
import { PreviewCourseCertificate } from "@/components/course/PreviewCourseCertificate";
export const dynamic="force-dynamic";
export default async function Certificate({params}:{params:Promise<{id:string}>}) {
  const {id}=await params,{shell,preview}=await requireReviewCoursePreview(id);
  return <><PreviewNotice preview={preview}/><PreviewCourseCertificate shell={shell} preview={preview}/></>;
}
