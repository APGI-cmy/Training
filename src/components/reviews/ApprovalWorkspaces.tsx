import Link from 'next/link';
import {ReviewOverrideControl} from './ReviewOverrideControl';
import type {ReviewRound} from '@/lib/course-review';
import type {CompanyRecord} from '@/lib/company-structure';
import {findWorkflowStep,type WorkflowStep} from '@/lib/publication-guide';
import {hasReviewTask} from '@/lib/review-tasks';
import {ApprovalWorkflowModal} from './ApprovalWorkflowModal';
import {PublicationProgress} from './PublicationProgress';
import {ReviewTaskPanel} from './ReviewTaskPanel';
import type {TrainingRelease} from '@/lib/review-publication-state';
import {commercialReviewPath} from '@/lib/review-navigation';
import {WorkflowSectionStatus} from './WorkflowSectionStatus';

export function ApprovalWorkspaces({round,brand,email,principal,hash,guide,commercialPage=false,activeRelease}:{round:ReviewRound;brand:CompanyRecord;email:string;principal:boolean;hash:string;guide:WorkflowStep[];commercialPage?:boolean;activeRelease?:TrainingRelease|null}){
 const v=round.document.workflow?.commercials.at(-1),person=round.document.participants.find(p=>p.email===email);
 const commercialVisible=principal||!!v?.offeredAt&&(round.document.workflow?.partnerEmail===email||!!person&&person.state!=='declined'&&hasReviewTask(person,'commercials'));
 const commercial=findWorkflowStep(guide,'commercials'),branding=findWorkflowStep(guide,'branding');
 const partner=!!brand.slug&&brand.slug!=='apgi';
 return <>
  {commercial&&partner&&!commercialPage?<div id="commercial-workflow" className="button-row"><Link className="primary-button" href={commercial.href??commercialReviewPath(round.id)}>Open commercial workflow</Link><WorkflowSectionStatus step={commercial}/></div>:null}
  {commercial&&!partner?<ApprovalWorkflowModal kind="commercials" title="Commercial preparation and sign-off" course={round.document.title} email={email} step={commercial} roundId={round.id} revision={round.revision} autoOpen={commercialPage}>
   {commercialVisible?<ReviewOverrideControl round={round} scope="commercials" principal={principal} brandRevision={brand.brand_revision} activeRelease={activeRelease}/>:null}{commercialVisible?<><PublicationProgress round={round} principal={principal} email={email} hash={hash} brandRevision={brand.brand_revision} guide={guide} activeRelease={activeRelease}/><ReviewTaskPanel mode="commercials" round={round} brand={brand} email={email} principal={principal} hash={hash} guide={guide}/></>:<p>The commercial proposal will be available when APGI sends the jointly approved offer. Content and branding reviews remain available in their own workflows.</p>}
  </ApprovalWorkflowModal>:null}
  {!commercialPage&&branding?<ApprovalWorkflowModal kind="branding" title="Platform branding and design" course={round.document.title} email={email} step={branding} roundId={round.id} revision={round.revision}>
   <ReviewOverrideControl round={round} scope="branding" principal={principal} brandRevision={brand.brand_revision} activeRelease={activeRelease}/><ReviewTaskPanel mode="branding" round={round} brand={brand} email={email} principal={principal} hash={hash} guide={guide}/>
  </ApprovalWorkflowModal>:null}
 </>;
}
