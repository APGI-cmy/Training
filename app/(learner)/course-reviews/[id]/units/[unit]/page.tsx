import Link from "next/link";
import { notFound } from "next/navigation";
import { requireReviewCoursePreview } from "@/server/services/course-preview";
import { PreviewNotice } from "@/components/course/PreviewProgress";
import { UnitViewer } from "@/components/course/UnitViewer";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { canWork, activeFindings, findingAppliesToUnit } from "@/lib/course-review";
import { hasReviewTask } from "@/lib/review-tasks";
import { reviewEbook } from "@/server/services/review-resources";
import { ReviewSlideTracking } from "@/components/reviews/ReviewSlideTracking";
import { ReviewPanel } from "@/components/reviews/ReviewPanel";
import { CoverageConfirmation } from "@/components/reviews/ReviewForms";
import { correctionRecheckUnits } from "@/lib/course-correction-scope";
import { evaluateViewerLabAvailability, getViewerLabSettings } from "@/lib/services/viewer-lab/viewer-lab-settings";
import "../../../reviews.css";
export const dynamic="force-dynamic";
export default async function ReviewUnit({params,searchParams}:{params:Promise<{id:string;unit:string}>;searchParams?:Promise<{feedback?:string;finding?:string}>}) {
  const {id,unit}=await params;
  const query=await searchParams;
  const {round,email,fresh,person,shell,preview,source}=await requireReviewCoursePreview(id);
  const content=getUnitContent(round.course_id,unit);if(!content)notFound();
  const lu=content.unit,ebook=reviewEbook(lu);
  const recheckPending=!fresh&&correctionRecheckUnits(round,source.fingerprint).includes(lu.slug);
  const editable=fresh&&canWork(round)&&!!person&&person.state!=="declined"&&hasReviewTask(person,"content");
  const viewerAvailability=content.course.slug==="scannex-training-programme"?evaluateViewerLabAvailability(await getViewerLabSettings(),lu.slug):undefined;
  const feedback=<ReviewPanel key={`${id}:${lu.slug}:${query?.finding??query?.feedback??""}`} id={id} unit={lu.slug} canEdit={editable} disabledReason={preview.notice} email={email} hasEbook={!!ebook} findings={activeFindings(round.document).filter(f=>findingAppliesToUnit(f,lu.slug))} openOnLoad={query?.feedback==="1"||!!query?.finding} initialFindingId={query?.finding}/>;
  return <><PreviewNotice preview={preview}/><p className="content-inner">{round.document.brand.name} · Review version {round.fingerprint.slice(0,12)}</p>
    <ReviewSlideTracking key={`${id}:${lu.slug}:${round.fingerprint}`} unit={lu.slug}>
      <UnitViewer key={`${preview.scope}:${lu.slug}`} content={content} units={shell.units} preview={preview} referenceEbook={ebook} feedback={feedback} viewerAvailability={viewerAvailability}/>
    </ReviewSlideTracking>
    <section className="content-band"><div className="content-inner review-box"><h2>Finish reviewing this LU</h2>
      {recheckPending?<p className="lu-pending">This updated LU needs a new coverage confirmation. Your earlier review remains saved. <a href={`/course-reviews/${id}#changes-implemented`}>Register the corrected package in Changes implemented</a>, then review this LU again and confirm coverage.</p>:null}
      {person?.role==="primary"&&hasReviewTask(person,"content")?<CoverageConfirmation id={id} unit={lu.slug} confirmed={!recheckPending&&person.coverage.includes(lu.slug)} locked={!editable}/>:null}
      <a className="secondary-button" href={`/course-reviews/${id}#review-unit-${lu.slug}`}>Return to this LU workflow</a>
    </div></section></>;
}
