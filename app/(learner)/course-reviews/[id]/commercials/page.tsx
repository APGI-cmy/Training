import Link from "next/link";
import {requireReview} from "@/server/services/course-reviews";
import {publicationGuide} from "@/lib/publication-guide";
import {WorkflowFrame} from "@/components/reviews/WorkflowGuide";
import {ApprovalWorkspaces} from "@/components/reviews/ApprovalWorkspaces";
import "../../reviews.css";
export const dynamic="force-dynamic";
export default async function CommercialWorkspace({params}:{params:Promise<{id:string}>}){
 const {id}=await params,{round,email,principal,source,fresh}=await requireReview(id);
 const guide=publicationGuide(round,source.fingerprint,source.brand.brand_revision,email,"commercials");
 return <WorkflowFrame steps={guide}><main className="review-page"><Link href={`/course-reviews/${id}`}>Back to course review and content checks</Link><h1>{round.document.title}</h1><p>{source.brand.name} · Commercial preparation and sign-off</p>
 {!fresh?<p className="notice-card">The course content has changed. You can read these recorded commercial terms and save a discussion proposal for the exact commercial version. Formal approvals remain blocked until the corrected content is registered. <Link href={`/course-reviews/${id}#changes-implemented`}>Open the deployment registration</Link>.</p>:null}
 <ApprovalWorkspaces round={round} brand={source.brand} email={email} principal={principal} hash={source.fingerprint} guide={guide} commercialPage/>
 </main></WorkflowFrame>;
}
