import {formText} from './company-structure';
import {percentageBps} from './commercial-planning';

export const platformPartnershipDefaults={apgiShare:'50',srmsShare:'50',stripeCostPayer:'APGI',otherCostPayer:'SRMS',developmentFunder:'SRMS'} as const;
export const platformJointOwnership='APGI platform identity: where a course is described as wholly owned by APGI, APGI is the public platform identity for equal joint ownership by APGI and SRMS, with each partner holding a 50% interest. This definition does not override a separately agreed transfer of course ownership to a client.';
export const routineMaintenanceTerms='Routine course maintenance is included. Major future upgrades, redevelopment or additional course development must be agreed and costed separately before work begins.';
export const continuingSalesClause=(client:string,alreadyOwned=false,apgiPermanent=false)=>apgiPermanent
 ?`Ongoing hosting and sales rights: the APGI platform retains ownership of this APGI-owned course and its rights to host and sell it. ${client}'s permissions are limited to the approved hosting, sales and course-assignment scope; those permissions do not transfer ownership.`
 :`Ongoing hosting and sales rights: ${alreadyOwned?`${client} owns the course from the outset, and grants the APGI platform the agreed continuing rights to host and sell the course`:`once development costs are recovered and ownership transfers to ${client}, the APGI platform retains the agreed rights to continue hosting and selling the course`}. The client remains the course owner; these are continuing hosting and sales permissions, not continuing ownership of the client’s course.`;
export const reciprocalScopeClause='Reciprocal sales scope: only individually listed and approved courses may be made available through a platform sharing partner. Client-specific or restricted courses are excluded from general reciprocal sharing. No course becomes available merely because this draft is saved; the required course assignment and publication approvals still apply.';

export function continuingSalesConfiguration(form:FormData,context:{courseId:string;clientName:string;ownershipModel:string;catalogue:{slug:string;title:string;restricted?:boolean}[]}){
 if(formText(form,'continuing_sales_rights')!=='yes')throw Error('Include the continuing APGI hosting and sales rights in this proposed partner agreement.');
 const raw=formText(form,'reciprocal_course_ids',0,5000)||'[]';let ids:unknown;try{ids=JSON.parse(raw);}catch{throw Error('Choose valid courses for reciprocal sharing.');}
 if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw Error('Choose distinct courses for reciprocal sharing.');
 const selected=ids.map(id=>context.catalogue.find(c=>c.slug===id));
 if(selected.some(c=>!c||c.restricted||c.slug===context.courseId))throw Error('Only explicitly selected, unrestricted other courses may enter the reciprocal catalogue.');
 return {continuing_sales_version:'1',continuing_sales_rights:'yes',reciprocal_course_ids:JSON.stringify(ids),
  reciprocal_course_titles:JSON.stringify(selected.map(c=>c!.title)),
  continuing_sales_conditions:formText(form,'continuing_sales_conditions',0,1500)||null,
  maintenance_terms:routineMaintenanceTerms,
  continuing_sales_terms:[continuingSalesClause(context.clientName,context.ownershipModel==='partner_paid',context.ownershipModel==='apgi_permanent'),reciprocalScopeClause,
   `Approved reciprocal course list: ${selected.length?selected.map(c=>c!.title).join('; '):'No other courses are included at this stage'}.`,routineMaintenanceTerms].join('\n')};
}

export function internalDistributionConfiguration(form:FormData){
 const apgi=percentageBps(formText(form,'apgi_share'),'APGI residual profit share'),srms=percentageBps(formText(form,'srms_share'),'SRMS residual profit share');
 if(apgi+srms!==10000)throw Error('APGI and SRMS residual profit shares must total 100%.');
 const currency=formText(form,'currency');if(!/^[A-Z]{3}$/.test(currency))throw Error('Use a three-letter uppercase currency code.');
 return {internal_model_version:'2',currency,apgi_share:(apgi/100).toFixed(2),srms_share:(srms/100).toFixed(2),
  ownership_apgi_share:'50.00',ownership_srms_share:'50.00',stripe_cost_payer:'APGI',other_cost_payer:'SRMS',development_funder:'SRMS',
  allocation_basis:'Approved costs and development recovery are accounted for separately from residual profit. Stripe cost responsibility belongs to APGI; all other operating and development cost responsibility belongs to SRMS.',
  ownership_terms:platformJointOwnership,notes:formText(form,'notes',0,5000)||null};
}
