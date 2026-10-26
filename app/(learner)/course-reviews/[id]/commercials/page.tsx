import Link from "next/link";
import {requireReview} from "@/server/services/course-reviews";
import {publicationGuide} from "@/lib/publication-guide";
import {WorkflowFrame} from "@/components/reviews/WorkflowGuide";
import {PublicationProgress} from "@/components/reviews/PublicationProgress";
import {ReviewTaskPanel} from "@/components/reviews/ReviewTaskPanel";
import {hasReviewTask} from "@/lib/review-tasks";
import "../../reviews.css";
export const dynamic="force-dynamic";
export default async function CommercialWorkspace({params}:{params:Promise<{id:string}>}){
 const {id}=await params,{round,email,principal,source,fresh}=await requireReview(id),v=round.document.workflow?.commercials.at(-1);
 const guide=publicationGuide(round,source.fingerprint,source.brand.brand_revision,email,"commercials");
 const person=round.document.participants.find(p=>p.email===email);
 const visible=principal||!!v?.offeredAt&&(round.document.workflow?.partnerEmail===email||!!person&&person.state!=="declined"&&hasReviewTask(person,"commercials"));
 return <WorkflowFrame steps={guide}><main className="review-page"><Link href={`/course-reviews/${id}`}>Back to course review and content checks</Link><h1>{round.document.title}</h1><p>{source.brand.name} · Commercial preparation and sign-off</p>
 {!fresh?<p className="notice-card">The course content has changed. You can read these recorded commercial terms and save a discussion proposal for the exact commercial version. Formal approvals remain blocked until the corrected content is registered. <Link href={`/course-reviews/${id}#changes-implemented`}>Open the deployment registration</Link>.</p>:null}
 {visible?<><PublicationProgress round={round} principal={principal} email={email} hash={source.fingerprint} brandRevision={source.brand.brand_revision} guide={guide}/><ReviewTaskPanel mode="commercials" round={round} brand={source.brand} email={email} principal={principal} hash={source.fingerprint} guide={guide}/></>:<p>The company commercial proposal will be available here when APGI sends the jointly approved offer. Content review remains available in the course review workspace.</p>}
 </main></WorkflowFrame>;
}
