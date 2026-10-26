import { notFound } from "next/navigation";
import { requireAdminCoursePreview } from "@/server/services/course-preview";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { LearningActivity } from "@/components/course/LearningActivity";
import { PreviewNotice } from "@/components/course/PreviewProgress";
import { UnitViewer } from "@/components/course/UnitViewer";
export const dynamic="force-dynamic";
export default async function FullPageAdminPreview({params}:{params:Promise<{courseSlug:string;unitSlug:string}>}) {
  const {courseSlug,unitSlug}=await params,{preview,shell}=await requireAdminCoursePreview(courseSlug);
  const content=getUnitContent(courseSlug,unitSlug);if(!content)notFound();
  return content.unit.scormPath?<LearningActivity content={content} preview={preview}/>:<><PreviewNotice preview={preview}/><UnitViewer content={content} units={shell.units} preview={preview}/></>;
}
