import type {PurchaseRoute} from './course-calculator';
import {offerCourses,quoteStructure,ROUTES,type PricingStructure} from './pricing-structures';
import type {PartnerRetainer} from './partner-commercial-terms';

export type PricingReview={
 primaryCourseId:string;
 fingerprint:string;
 structure:PricingStructure;
 planningOnly:boolean;
 quantities:Record<PurchaseRoute,number>;
 structureId?:string;
 retainer?:PartnerRetainer;
};

export function anchorPricingStructure(structure:PricingStructure){
 const primary=offerCourses(structure,'individual')[0];
 const offers={...structure.offers};
 for(const route of ROUTES){
  if(route==='wallet'&&structure.categoryWallet)continue;
  offers[route]={...offers[route],editionIds:offerCourses(structure,route).map(c=>c.editionId)};
 }
 return {...structure,offers,courses:[primary,...structure.courses.filter(c=>c.editionId!==primary.editionId)]};
}

export function reviewQuantities(structure:PricingStructure,values:Partial<Record<PurchaseRoute,number>>={}){
 return Object.fromEntries(ROUTES.map(route=>{
  const {minSeats,maxSeats}=structure.offers[route];
  const quantity=values[route];
  return [route,typeof quantity==='number'&&Number.isSafeInteger(quantity)?Math.max(minSeats,Math.min(maxSeats,quantity)):minSeats];
 })) as Record<PurchaseRoute,number>;
}

export function shopOffer(structure:PricingStructure,route:PurchaseRoute){
 const terms=structure.offers[route],quote=quoteStructure(structure,route,terms.minSeats);
 const prices:[number,number,number,number,number,number][]=[];
 for(let seats=terms.minSeats;seats<=terms.maxSeats;seats++){
  const {result}=seats===terms.minSeats?quote:quoteStructure(structure,route,seats);
  prices.push([seats,result.totalCents,result.contentCents,result.platformCents,result.buyerProcessingCents,result.effectiveDiscountBps]);
 }
 return {route,min:terms.minSeats,max:terms.maxSeats,months:terms.months,cap:terms.courseCap,credits:quote.result.credits,courses:quote.courses.map(c=>c.title),commercial:quote.commercial?{balanceUnit:quote.commercial.balanceUnit,walletCentsPerLearner:quote.commercial.walletCentsPerLearner,annualContentBps:quote.commercial.annualContentBps}:undefined,prices};
}
