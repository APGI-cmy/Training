import {TIGER_COURSE_ID,TIGER_PRICING_OWNER_SLUG} from './course-pricing-ownership';
import {moneyLabel,offerCourses,ROUTES,type PricingStructure} from './pricing-structures';

export const COMPARISON_QUANTITIES={individual:1,seat_pack:100,wallet:1,subscription:100};
export type PartnerRetainer={state:'paid-upfront'}|{state:'published';remainingCents:number;rate:string;currency:string;base:'partner share'|'cost-cleared pool'};

export function prepaidDevelopment(companySlug:string,courseId:string):PartnerRetainer|undefined{
 // The NKS commercial instruction confirmed development was paid in advance.
 // Earlier signed release and payment records retain their original contents.
 if(companySlug===TIGER_PRICING_OWNER_SLUG&&courseId===TIGER_COURSE_ID)return {state:'paid-upfront'};
}

export function retainerLabel(retainer:PartnerRetainer){
 return retainer.state==='paid-upfront'
  ?'None · development paid in advance'
  :`${retainer.rate}% of the ${retainer.base} until the remaining ${moneyLabel(retainer.remainingCents,retainer.currency)} is recovered`;
}

export function partnerCourseShares(structure:PricingStructure){
 const shares=new Map<string,{apgi:number;partner:number;courses:Set<string>}>();
 for(const route of ROUTES){
  if(route==='wallet'&&structure.categoryWallet&&!structure.categoryWallet.catalogue.length)continue;
  for(const course of offerCourses(structure,route)){
   const amounts=structure.offers[route].shares[course.editionId];
   if(!amounts)continue;
   const apgi=amounts.apgiBps/100,partner=(amounts.ownerBps+amounts.sellerBps)/100,key=`${apgi}:${partner}`;
   const entry=shares.get(key)??{apgi,partner,courses:new Set<string>()};
   entry.courses.add(course.title);shares.set(key,entry);
  }
 }
 return [...shares.values()];
}
