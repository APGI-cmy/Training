import Link from "next/link";
import {notFound} from "next/navigation";
import {requireReview} from "@/server/services/course-reviews";
import {canWork} from "@/lib/course-review";
import {getUnitContent} from "@/lib/services/courses/get-unit-content";
import {encodeAssetPath} from "@/lib/courses";
import {ScormPlayer} from "@/components/course/ScormPlayer";
import {ReviewPanel} from "@/components/reviews/ReviewPanel";
import {QuizEngine} from "@/components/QuizEngine";
import {ScannexTheoryAssessment} from "@/components/assessments/ScannexTheoryAssessment";
import {getScannexTheoryQuestions} from "@/server/assessments/scannex-theory-bank";
import "../../../reviews.css";
export const dynamic="force-dynamic";
export default async function ReviewUnit({params}:{params:Promise<{id:string;unit:string}>}){
 const {id,unit}=await params,{round,email,fresh}=await requireReview(id),content=getUnitContent(round.course_id,unit);if(!content)notFound();
 const person=round.document.participants.find(p=>p.email===email),editable=canWork(round)&&fresh&&!!person&&person.state!=="declined"&&person.state!=="finished";
 if(!fresh)return <main className="review-page"><h1>Review version changed</h1><p>The published assets or branding changed. This round is retained as evidence, but a new review round is required before viewing or approving changed material.</p><Link href={`/course-reviews/${id}`}>Return to review team</Link></main>;
 const {course,unit:lu,previous,next,embeddedContentHref}=content;
 return <main className="review-page"><div className="review-actions"><Link href={`/course-reviews/${id}`}>Return to review and confirm coverage</Link>{previous?<Link href={`/course-reviews/${id}/units/${previous.slug}`}>Previous LU</Link>:null}{next?<Link href={`/course-reviews/${id}/units/${next.slug}`}>Next LU</Link>:null}</div><h1>{lu.title}</h1><p>{round.document.brand.name} · Review version {round.fingerprint.slice(0,12)} · Preview only — learner progress and grades are not saved.</p>{lu.scormPath?<ScormPlayer courseSlug={course.slug} unitSlug={lu.slug} launchSrc={encodeAssetPath(lu.scormPath)} title={lu.title} mode="preview"/>:<iframe title={`${lu.title} review presentation`} className="review-player" src={encodeAssetPath(embeddedContentHref??lu.publishedPath)} allow="fullscreen" allowFullScreen/>}<p><a href={encodeAssetPath(lu.publishedPath)} target="_blank" rel="noreferrer">Open reference e-book</a></p>{lu.quiz.length?<QuizEngine unitId={`review-${id}-${lu.id}`} questions={lu.quiz} preview/>:null}{lu.practicalAssessment&&course.slug==="scannex-training-programme"?<><ScannexTheoryAssessment reviewId={id} courseSlug={course.slug} questions={getScannexTheoryQuestions()} latestResult={null}/><p>The 32-mark practical remains a supervised, assessor-controlled native Scannex exercise. This review does not open a live assessment or award practical marks.</p></>:null}<ReviewPanel id={id} unit={lu.slug} canEdit={editable}/></main>;
}
