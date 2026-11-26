import Link from "next/link";
import {requireReview} from "@/server/services/course-reviews";
import {reviewLearnerRelease} from "@/server/services/course-publication-status";
import {findWorkflowStep,publicationGuide} from "@/lib/publication-guide";
import {WorkflowFrame} from "@/components/reviews/WorkflowGuide";
import {ApprovalWorkspaces} from "@/components/reviews/ApprovalWorkspaces";
import {CommercialPricingReviews} from "@/components/reviews/CommercialPricingReviews";
import {PartnerCommercialSignoff} from "@/components/reviews/PartnerCommercialSignoff";
import {pricingSignoffProgress} from '@/server/services/review-requests';
import "../../reviews.css";
export const dynamic="force-dynamic";
export default async function CommercialWorkspace({params}:{params:Promise<{id:string}>}){
 const {id}=await params,{round,email,principal,source,fresh}=await requireReview(id);
 const [activeRelease,pricingProgress]=await Promise.all([reviewLearnerRelease(round),pricingSignoffProgress(round)]);
 const guide=publicationGuide(round,source.fingerprint,source.brand.brand_revision,email,"commercials",pricingProgress);
 return <WorkflowFrame steps={guide} guided={round.document.reviewProcessVersion===3}><main className="review-page"><Link href={`/course-reviews/${id}#review-guidance`}>Back to course review and content checks</Link><h1>{round.document.title}</h1><p>{source.brand.name} · Commercial preparation and sign-off</p>
 {source.brand.slug!=='apgi'?<PartnerCommercialSignoff round={round} company={source.brand} email={email} progress={pricingProgress} step={findWorkflowStep(guide,'commercials')}/>:<>
  {!fresh?<p className="notice-card">The course content has changed. You can read these recorded commercial terms and save a discussion proposal for the exact commercial version. Formal approvals remain blocked until the corrected content is registered. <Link href={`/course-reviews/${id}#changes-implemented`}>Open the deployment registration</Link>.</p>:null}
  <CommercialPricingReviews company={round.organisation_id} course={round.course_id}/>
  <ApprovalWorkspaces round={round} brand={source.brand} email={email} principal={principal} hash={source.fingerprint} guide={guide} activeRelease={activeRelease} commercialPage/>
 </>}
 </main></WorkflowFrame>;
}
