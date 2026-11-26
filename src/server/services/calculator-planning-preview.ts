import 'server-only';
import type {CostSchedule} from '@/lib/course-calculator';
import type {CreditCourse} from '@/lib/credit-course-metadata';
import {TIGER_COURSE_ID,TIGER_PRICING_OWNER_SLUG} from '@/lib/course-pricing-ownership';
import {rows} from './company-structure';
import {productionCompanyId} from './tenant-courses';

const referenceRelease='99e49830-2c2d-460e-b6df-c4a1b933b595';

// APGI calculator cost version 2de36785, 17 November 2026. Preserve
// the recorded assumptions without exposing its internal commercial draft.
const referenceCost:CostSchedule={
 id:'estimate-20261117',sourceDraftId:'estimate-20261117',currency:'USD',
 monthlyPoolCents:76035,activeLearners:30,newEnrolments:10,variableCents:0,
 processorBps:370,processorFixedCents:22,
 source:'the APGI planning cost version recorded on 17 November 2026',
 rates:{public:250,industry:750,client:1500},
 floors:{public:500,industry:2500,client:5000},
 margins:{public:2500,industry:4000,client:5500},
};

export async function calculatorPlanningPreview(company:{id:string;slug:string}){
 if(company.slug!==TIGER_PRICING_OWNER_SLUG||company.id!==productionCompanyId())return null;
 const [offering]=await rows<{reviewed_release_id:string}>(
  `/rest/v1/organisation_offerings?organisation_id=eq.${company.id}&course_id=eq.${TIGER_COURSE_ID}&status=eq.published&shared_distribution_id=is.null&select=reviewed_release_id&limit=1`,
 );
 if(offering?.reviewed_release_id!==referenceRelease)return null;
 // Tiger's workload is recorded in the original credit snapshot.
 // Preview identifiers cannot be saved as cost versions or course editions.
 const course:CreditCourse={
  id:'estimate-tiger-workload',editionId:'estimate-tiger-edition',courseId:TIGER_COURSE_ID,
  title:'Tiger Kidnapping in Telecommunications',ownerId:company.id,ownerIsApgi:false,
  scope:'client',currency:'USD',hours:3.5,minimumCents:0,
  evidence:'Tiger workload and credit record, used for NKS planning estimates.',
  industry:'Telecommunications',clientName:'NKS Capital',
 };
 return {costs:[referenceCost],courses:[course]};
}
