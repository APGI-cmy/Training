import { requireAdminCoursePreview } from "@/server/services/course-preview";
import { PreviewNotice } from "@/components/course/PreviewProgress";
import { PreviewCourseCertificate } from "@/components/course/PreviewCourseCertificate";
export const dynamic="force-dynamic";
export default async function Certificate({params}:{params:Promise<{courseSlug:string}>}) {
  const {courseSlug}=await params,{shell,preview}=await requireAdminCoursePreview(courseSlug);
  return <><PreviewNotice preview={preview}/><PreviewCourseCertificate shell={shell} preview={preview}/></>;
}
