import type {ReviewRound} from '@/lib/course-review';
import type {CompanyRecord} from '@/lib/company-structure';
import {findWorkflowStep,type WorkflowStep} from '@/lib/publication-guide';
import {hasReviewTask} from '@/lib/review-tasks';
import {ApprovalWorkflowModal} from './ApprovalWorkflowModal';
import {PublicationProgress} from './PublicationProgress';
import {ReviewTaskPanel} from './ReviewTaskPanel';

export function ApprovalWorkspaces({round,brand,email,principal,hash,guide,commercialPage=false}:{round:ReviewRound;brand:CompanyRecord;email:string;principal:boolean;hash:string;guide:WorkflowStep[];commercialPage?:boolean}){
 const v=round.document.workflow?.commercials.at(-1),person=round.document.participants.find(p=>p.email===email);
 const commercialVisible=principal||!!v?.offeredAt&&(round.document.workflow?.partnerEmail===email||!!person&&person.state!=='declined'&&hasReviewTask(person,'commercials'));
 const commercial=findWorkflowStep(guide,'commercials'),branding=findWorkflowStep(guide,'branding');
 return <>
  {commercial?<ApprovalWorkflowModal kind="commercials" title="Commercial preparation and sign-off" course={round.document.title} email={email} step={commercial} roundId={round.id} revision={round.revision} autoOpen={commercialPage}>
   {commercialVisible?<><PublicationProgress round={round} principal={principal} email={email} hash={hash} brandRevision={brand.brand_revision} guide={guide}/><ReviewTaskPanel mode="commercials" round={round} brand={brand} email={email} principal={principal} hash={hash} guide={guide}/></>:<p>The commercial proposal will be available when APGI sends the jointly approved offer. Content and branding reviews remain available in their own workflows.</p>}
  </ApprovalWorkflowModal>:null}
  {!commercialPage&&branding?<ApprovalWorkflowModal kind="branding" title="Platform branding and design" course={round.document.title} email={email} step={branding} roundId={round.id} revision={round.revision}>
   <ReviewTaskPanel mode="branding" round={round} brand={brand} email={email} principal={principal} hash={hash} guide={guide}/>
  </ApprovalWorkflowModal>:null}
 </>;
}
