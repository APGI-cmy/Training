import { notFound } from "next/navigation";
import { requireReviewCoursePreview } from "@/server/services/course-preview";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { LearningActivity } from "@/components/course/LearningActivity";
import { ReviewSlideTracking } from "@/components/reviews/ReviewSlideTracking";
import { ReviewPanel } from "@/components/reviews/ReviewPanel";
import { canWork, activeFindings, findingAppliesToUnit } from "@/lib/course-review";
import { hasReviewTask } from "@/lib/review-tasks";
import { reviewEbook } from "@/server/services/review-resources";
import "../../../../reviews.css";
export const dynamic="force-dynamic";
export default async function Activity({params}:{params:Promise<{id:string;unit:string}>}) {
  const {id,unit}=await params,{round,person,preview,email,fresh}=await requireReviewCoursePreview(id);
  const content=getUnitContent(round.course_id,unit);if(!content?.unit.scormPath)notFound();
  const lu=content.unit,editable=fresh&&canWork(round)&&!!person&&hasReviewTask(person,"content");
  return <ReviewSlideTracking key={`${preview.scope}:${lu.slug}`} unit={lu.slug}><LearningActivity content={content} preview={preview} feedback={<ReviewPanel key={`${id}:${lu.slug}`} id={id} unit={lu.slug} canEdit={editable} disabledReason={preview.notice} email={email} hasEbook={!!reviewEbook(lu)} findings={activeFindings(round.document).filter(f=>findingAppliesToUnit(f,lu.slug))}/>}/></ReviewSlideTracking>;
}
