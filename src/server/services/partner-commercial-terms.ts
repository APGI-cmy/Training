import 'server-only';
import {validId} from '@/lib/company-structure';
import {moneyCents} from '@/lib/commercial-planning';
import {bothCommercialApprovals,currentCommercial,type PublicationWorkflow} from '@/lib/publication-workflow';
import {prepaidDevelopment,type PartnerRetainer} from '@/lib/partner-commercial-terms';
import {rows} from './company-structure';

export async function partnerRetainer(company:{id:string;slug:string},courseId:string):Promise<PartnerRetainer|undefined>{
 const prepaid=prepaidDevelopment(company.slug,courseId);
 if(prepaid)return prepaid;
 const [offering]=await rows<{reviewed_release_id:string|null}>(
  `/rest/v1/organisation_offerings?organisation_id=eq.${validId(company.id)}&course_id=eq.${encodeURIComponent(courseId)}&status=eq.published&select=reviewed_release_id&limit=1`,
 );
 if(!offering?.reviewed_release_id)return;
 const [release]=await rows<{document:{workflow?:PublicationWorkflow}}>(
  `/rest/v1/course_review_rounds?id=eq.${validId(offering.reviewed_release_id)}&course_id=eq.${encodeURIComponent(courseId)}&status=eq.published&select=document&limit=1`,
 );
 const workflow=release?.document.workflow,terms=workflow&&currentCommercial(workflow);
 if(!workflow||!terms||!bothCommercialApprovals(terms)||workflow.partner&&(!terms.acceptance||workflow.partnerCompanyId!==company.id))return;
 const {currency,development_cost,already_paid,recovery_rate,recovery_base,development_status}=terms.configuration;
 if(development_status!=='recover'||!currency||!recovery_rate||Number(recovery_rate)<=0)return;
 const remainingCents=moneyCents(development_cost??'','development cost')-moneyCents(already_paid??'','development paid');
 if(remainingCents>0)return {state:'published',remainingCents,rate:recovery_rate,currency,base:recovery_base==='partner_share'?'partner share':'cost-cleared pool'};
}
