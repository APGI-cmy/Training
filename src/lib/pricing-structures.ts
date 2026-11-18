import {categoryWalletQuote,walletCourses,validateCategoryWallet,CATEGORY_WALLET_POLICY,type CategoryWallet,type WalletPurchase} from './category-wallet';
import type {CreditCourse} from '@/lib/credit-course-metadata';
import {commercialDefaults,commercialQuote,validateCommercial,type CommercialTerms,type CommercialBreakdown} from './commercial-pricing';
import {allocation,calculateCoursePrice,creditUnits,integer,type CostSchedule,type PurchaseRoute,type CalculatorInput} from './course-calculator';

export const LEGACY_STRUCTURE_VERSION='2026-11-17.1';
// Keep this independent of the mutually importing quote modules' initialization order.
export const STRUCTURE_VERSION='2026-11-17.3';
export const ROUTES:PurchaseRoute[]=['individual','seat_pack','wallet','subscription'];
export const ROUTE_NAMES:Record<PurchaseRoute,string>={individual:'Individual course',seat_pack:'Bulk course seats',wallet:'Learning wallet',subscription:'Platform access'};
export type RecipientShares={ownerBps:number;sellerBps:number;apgiBps:number};
export type OfferTerms={rateCents:number;minSeats:number;maxSeats:number;months:number;courseCap:number;credits:number;shares:Record<string,RecipientShares>;exceptionReason:string;ownerAuthority:string;editionIds?:string[]};
export type PricingStructure={version:string;mode:'credits'|'courses';company:{id:string;isApgi:boolean};cost:CostSchedule;courses:CreditCourse[];paymentMethod:'card'|'invoice';feeBearer:'buyer'|'platform';offers:Record<PurchaseRoute,OfferTerms>;commercial?:CommercialTerms;categoryWallet?:CategoryWallet};
export function legacyDefaultStructure(cost:CostSchedule,courses:CreditCourse[],company:{id:string;isApgi:boolean}):PricingStructure{
 if(!courses.length)throw Error('Choose a course with recorded credits.');
 const scope=courses[0].scope,compatible=courses.filter(c=>c.scope===scope&&c.currency===cost.currency).map(c=>({...c})),shares=Object.fromEntries(compatible.map(c=>{const a=allocation(0,c.ownerIsApgi,company.isApgi,c.ownerId===company.id);return [c.editionId,{ownerBps:a.ownerBps,sellerBps:a.sellerBps,apgiBps:a.apgiBps}];}));
 const offers=Object.fromEntries(ROUTES.map(route=>{const cap=Math.min(compatible.length,route==='wallet'?3:route==='subscription'?5:1);const credits=compatible.map(c=>c.hours/10).sort((a,b)=>b-a).slice(0,cap).reduce((a,b)=>a+b,0);return [route,{rateCents:cost.rates[scope],minSeats:route==='individual'?1:10,maxSeats:route==='individual'?1:scope==='client'?50:1000,months:route==='subscription'?12:3,courseCap:cap,credits,shares:structuredClone(shares),exceptionReason:'',ownerAuthority:''}];})) as Record<PurchaseRoute,OfferTerms>;
 return {version:LEGACY_STRUCTURE_VERSION,mode:'courses',company,cost,courses:compatible,paymentMethod:'card',feeBearer:'buyer',offers};
}
export function legacyValidateStructure(s:PricingStructure){
 if(s.version!==LEGACY_STRUCTURE_VERSION||!['credits','courses'].includes(s.mode)||!['card','invoice'].includes(s.paymentMethod)||!['buyer','platform'].includes(s.feeBearer)||!s.company.id)throw Error('Choose valid pricing conditions.');
 if(!s.courses.length||s.courses.length>100||new Set(s.courses.map(c=>c.editionId)).size!==s.courses.length)throw Error('Choose distinct recorded course editions.');
 for(const route of ROUTES){const o=s.offers[route];if(!o)throw Error('All four pricing options are required.');integer(o.rateCents,'price per credit',1,10000000);integer(o.minSeats,'minimum quantity',route==='individual'?1:10,1000);integer(o.maxSeats,'maximum quantity',o.minSeats,1000);integer(o.months,'access months',1,60);integer(o.courseCap,'course limit',1,s.courses.length);
  if(route==='individual'&&(o.minSeats!==1||o.maxSeats!==1))throw Error('Individual purchases are for one learner.');
  if(['individual','seat_pack'].includes(route)&&o.courseCap!==1)throw Error('Named-course options cover one course.');
  if(s.courses[0].scope==='client'&&o.maxSeats>50&&o.exceptionReason.trim().length<10)throw Error('Client groups above 50 need a recorded exception for approval.');
  for(const c of s.courses){const a=o.shares[c.editionId];if(!a)throw Error('Complete the recipient allocation.');for(const n of Object.values(a))integer(n,'recipient percentage',0,10000);if(a.ownerBps+a.sellerBps+a.apgiBps!==10000)throw Error('Recipient percentages must total 100%.');
   const normal=allocation(0,c.ownerIsApgi,s.company.isApgi,c.ownerId===s.company.id);if(a.ownerBps!==normal.ownerBps||a.sellerBps!==normal.sellerBps||a.apgiBps!==normal.apgiBps){if(o.exceptionReason.trim().length<10||o.ownerAuthority.trim().length<5)throw Error('Changed recipient shares require a reason and the course owner’s authority reference.');}
  }
  legacyQuoteStructure(s,route,o.minSeats);legacyQuoteStructure(s,route,o.maxSeats);
 }
 return s;
}
export function legacyQuoteStructure(s:PricingStructure,route:PurchaseRoute,seats:number){
 const o=s.offers[route];if(!o||!ROUTES.includes(route))throw Error('Select an approved pricing option.');integer(seats,'quantity',o.minSeats,o.maxSeats);
 const courses=['individual','seat_pack'].includes(route)?s.courses.slice(0,1):s.courses;
 const units=courses.map(c=>creditUnits(c.hours)).sort((a,b)=>b-a).slice(0,o.courseCap).reduce((a,b)=>a+b,0);
 const input:CalculatorInput={mode:['individual','seat_pack'].includes(route)?'courses':s.mode,route,scope:courses[0].scope,seats,months:o.months,credits:s.mode==='courses'?units/1e6:o.credits,courseCap:o.courseCap,driver:'credits',deliveryCents:0,deliveryEvidence:'',feeBearer:s.feeBearer,discount:route!=='individual'};
 // Keep the established progressive bands, commitment discounts and floors intact.
 // A new quote fixes its own denominator; old cost versions and quotes are untouched.
 const cost={...s.cost,activeLearners:route==='individual'?20:seats,rates:{...s.cost.rates,[input.scope]:o.rateCents},processorBps:s.paymentMethod==='invoice'?0:s.cost.processorBps,processorFixedCents:s.paymentMethod==='invoice'?0:s.cost.processorFixedCents};
 const result=calculateCoursePrice(input,cost,courses,s.company);
 const allocated=courses.map(c=>({...c,negotiatedShares:o.shares[c.editionId]}));
 const named=courses.length===1?o.shares[courses[0].editionId]:null;
 const split=named?{owner:Math.floor(result.contentCents*named.ownerBps/10000),seller:Math.floor(result.contentCents*named.sellerBps/10000),...named}:null;
 return {input,cost,courses:allocated,result:{...result,allocation:split?{...split,apgi:result.contentCents-split.owner-split.seller,sellerIsApgi:s.company.isApgi}:null,structureVersion:LEGACY_STRUCTURE_VERSION,policyVersion:'APGI-COMM-PRICE-001/1.2-draft',denominator:cost.activeLearners,floorBinding:result.effectiveDiscountBps===0,internalResidualSplit:'50/50 unchanged'}};
}
export const moneyLabel=(n:number,currency:string)=>`${currency} ${(n/100).toFixed(2)}`;

export type LegacyQuote=ReturnType<typeof legacyQuoteStructure>;
export type StructureQuote=LegacyQuote&{commercial?:CommercialBreakdown};
export function defaultStructure(cost:CostSchedule,courses:CreditCourse[],company:{id:string;isApgi:boolean}):PricingStructure{
 const seed=legacyDefaultStructure(cost,courses,company);seed.courses=courses.map(c=>({...c}));
 const shares=Object.fromEntries(courses.map(c=>{const a=allocation(0,c.ownerIsApgi,company.isApgi,c.ownerId===company.id);return [c.editionId,{ownerBps:a.ownerBps,sellerBps:a.sellerBps,apgiBps:a.apgiBps}];}));
 for(const route of ROUTES)seed.offers[route].shares=structuredClone(shares);
 return commercialDefaults(seed);
}
export function validateStructure(s:PricingStructure){
 if(s.version===LEGACY_STRUCTURE_VERSION)return legacyValidateStructure(s);
 validateCommercial(s);if(s.categoryWallet)validateCategoryWallet(s);for(const route of ROUTES){quoteStructure(s,route,s.offers[route].minSeats);quoteStructure(s,route,s.offers[route].maxSeats,route==='wallet'&&s.categoryWallet?{faceCents:s.categoryWallet.maxFaceCents,categories:s.categoryWallet.categories}:undefined);}return s;
}
export function offerCourses(s:PricingStructure,route:PurchaseRoute):CreditCourse[]{
 if(route==='wallet'&&s.categoryWallet)return walletCourses(s);
 const ids=s.offers[route]?.editionIds;
 if(ids===undefined)return route==='individual'?s.courses.slice(0,1):s.courses;
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!s.courses.some(c=>c.editionId===id)))throw Error('Select distinct eligible courses for each pricing option.');
 const courses=ids.map(id=>s.courses.find(c=>c.editionId===id)!);
 if(route==='individual'&&courses.length!==1)throw Error('Choose exactly one course for the individual option.');
 return courses;
}
export function selectOfferCourses(s:PricingStructure,route:PurchaseRoute,ids:string[]):PricingStructure{
 const next={...s,offers:{...s.offers,[route]:{...s.offers[route],editionIds:ids,courseCap:route==='individual'?1:ids.length,credits:s.courses.filter(c=>ids.includes(c.editionId)).reduce((n,c)=>n+c.hours/10,0)}}};
 offerCourses(next,route);
 return next;
}
export function quoteStructure(s:PricingStructure,route:PurchaseRoute,seats:number,walletPurchase?:WalletPurchase):StructureQuote{
 if(s.version===LEGACY_STRUCTURE_VERSION)return legacyQuoteStructure(s,route,seats);
 if(s.version!==STRUCTURE_VERSION)throw Error('Unsupported retained pricing version.');
 if(route==='wallet'&&s.categoryWallet)return categoryWalletQuote(s,seats,walletPurchase);
 const selected=offerCourses(s,route),seed=legacyDefaultStructure(s.cost,[selected[0]],s.company),o=s.offers[route];
 if(!o||!ROUTES.includes(route))throw Error('Choose an approved buying option.');
 seed.offers[route]={...o,courseCap:1,credits:selected[0].hours/10,rateCents:s.cost.rates[selected[0].scope]};
 const q=commercialQuote(s,route,seats,legacyQuoteStructure(seed,route,seats));return s.categoryWallet?{...q,result:{...q.result,policyVersion:CATEGORY_WALLET_POLICY}}:q;
}
