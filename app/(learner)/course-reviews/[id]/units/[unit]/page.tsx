import {WorkflowFrame} from "@/components/reviews/WorkflowGuide";
import {publicationGuide} from "@/lib/publication-guide";
import {hasReviewTask,assignedTasks,reviewTaskLabels,companyBrandApproved} from "@/lib/review-tasks";
import Link from "next/link";
import {notFound} from "next/navigation";
import {requireReview} from "@/server/services/course-reviews";
import {canWork,activeFindings,findingAppliesToUnit} from "@/lib/course-review";
import {getUnitContent} from "@/lib/services/courses/get-unit-content";
import {encodeAssetPath} from "@/lib/courses";
import {ScormPlayer} from "@/components/course/ScormPlayer";
import {PresentationViewport} from "@/components/course/PresentationViewport";
import {reviewEbook} from "@/server/services/review-resources";
import {CoverageConfirmation} from "@/components/reviews/ReviewForms";
import {ReviewSlideTracking} from "@/components/reviews/ReviewSlideTracking";
import {ReviewPanel} from "@/components/reviews/ReviewPanel";
import {QuizEngine} from "@/components/QuizEngine";
import {ScannexTheoryAssessment} from "@/components/assessments/ScannexTheoryAssessment";
import {getScannexTheoryQuestions} from "@/server/assessments/scannex-theory-bank";
import "../../../reviews.css";
export const dynamic="force-dynamic";
export default async function ReviewUnit({params}:{params:Promise<{id:string;unit:string}>}){
 const {id,unit}=await params,{round,email,fresh,source}=await requireReview(id),content=getUnitContent(round.course_id,unit);if(!content)notFound();
 const person=round.document.participants.find(p=>p.email===email),editable=canWork(round)&&fresh&&!!person&&person.state!=="declined"&&hasReviewTask(person,"content");
 if(!fresh)return <main className="review-page"><h1>Review version changed</h1><p>The deployed course changed. Earlier evidence is retained. Johan or Jorrie must register the corrected deployment in Changes implemented before this review continues.</p><Link href={`/course-reviews/${id}#changes-implemented`}>Return to Changes implemented</Link></main>;
 const {course,unit:lu,previous,next,embeddedContentHref}=content,ebook=reviewEbook(lu);
 const navigation=<nav className="review-actions review-unit-navigation" aria-label="Learning unit review navigation"><Link className="secondary-button" href={`/course-reviews/${id}#review-units`}>Back to review summary</Link>{previous?<Link className="secondary-button" href={`/course-reviews/${id}/units/${previous.slug}`}>Previous LU: {previous.title}</Link>:null}{next?<Link className="primary-button" href={`/course-reviews/${id}/units/${next.slug}`}>Next LU: {next.title}</Link>:<Link className="primary-button" href={`/course-reviews/${id}#review-summary`}>Finish — review findings and submit report</Link>}</nav>;
 return <WorkflowFrame steps={publicationGuide(round,source.fingerprint,source.brand.brand_revision,email,"content")}><main className="review-page">{navigation}<h1>{lu.title}</h1><p>{round.document.brand.name} · Review version {round.fingerprint.slice(0,12)} · Preview only — learner progress and grades are not saved.</p><ReviewSlideTracking key={lu.slug}><PresentationViewport title={lu.title}>{lu.scormPath?<ScormPlayer courseSlug={course.slug} unitSlug={lu.slug} launchSrc={encodeAssetPath(lu.scormPath)} title={lu.title} mode="preview"/>:<iframe title={`${lu.title} review presentation`} className="review-player" src={encodeAssetPath(embeddedContentHref??lu.publishedPath)} allow="fullscreen" allowFullScreen/>}<ReviewPanel id={id} unit={lu.slug} canEdit={editable} email={email} hasEbook={!!ebook} findings={activeFindings(round.document).filter(f=>findingAppliesToUnit(f,lu.slug))}/></PresentationViewport></ReviewSlideTracking>{ebook?<p><a className="secondary-button" href={encodeAssetPath(ebook)} target="_blank" rel="noreferrer">Open reference e-book (PDF)</a></p>:<p>No e-book available for this course.</p>}{lu.quiz.length?<QuizEngine unitId={`review-${id}-${lu.id}`} questions={lu.quiz} preview/>:null}{lu.practicalAssessment&&course.slug==="scannex-training-programme"?<><ScannexTheoryAssessment reviewId={id} courseSlug={course.slug} questions={getScannexTheoryQuestions()} latestResult={null}/><p>The 32-mark practical remains a supervised, assessor-controlled native Scannex exercise. This review does not open a live assessment or award practical marks.</p></>:null}<section className="review-box"><h2>Finish reviewing this LU</h2>{person?.role==="primary"&&hasReviewTask(person,"content")?<CoverageConfirmation id={id} unit={lu.slug} confirmed={person.coverage.includes(lu.slug)} locked={!editable}/>:null}{navigation}</section></main></WorkflowFrame>;
}
