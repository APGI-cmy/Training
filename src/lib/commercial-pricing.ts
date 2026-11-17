import {allocation,creditUnits,integer,type CostSchedule,type CreditCourse,type PurchaseRoute} from './course-calculator';
import type {PricingStructure,LegacyQuote} from './pricing-structures';

export const COMMERCIAL_VERSION='2026-11-17.3';
export const COMMERCIAL_POLICY='APGI-COMM-PRICE-001/1.3-draft';
export type CourseValue={audienceLevel:number;marketMultiplierBps:number};
export type CommercialTerms={referenceHours:8;referenceIndex:3;values:Record<string,CourseValue>;annualContentBps:number;walletCentsPerLearner:number;rentalRates:{learners:number;cents:number}[]};
export const RENTAL_RATES=[{learners:10,cents:700},{learners:100,cents:700},{learners:300,cents:450},{learners:500,cents:400},{learners:1000,cents:400}];
export const QUANTITY_MARKS=Array.from({length:10},(_,i)=>({learners:(i+1)*100,percent:(i+1)*5}));
const up=(v:number)=>Math.ceil(v);
export function bulkDiscountBps(n:number){integer(n,'course places',1,10000);return Math.min(5000,n*5);}
export function rentalMonthlyCents(n:number,rates=RENTAL_RATES){
 integer(n,'rental learner places',1,10000);let before=rates[0];for(const next of rates.slice(1)){if(n<=next.learners)return up(before.cents+(next.cents-before.cents)*(n-before.learners)/(next.learners-before.learners));before=next;}return before.cents;
}
export function commercialDefaults(seed:PricingStructure):PricingStructure{
 const values=Object.fromEntries(seed.courses.map(c=>[c.editionId,{audienceLevel:c.courseId==='vpshr-level-0'?2:c.scope==='client'?4:3,marketMultiplierBps:10000}]));
 const offers=Object.fromEntries(Object.entries(seed.offers).map(([route,o])=>[route,{...o,rateCents:12000,months:route==='subscription'?12:3,maxSeats:route==='individual'?1:1000,courseCap:route==='individual'?1:Math.min(route==='subscription'?4:seed.courses.length,seed.courses.length)}])) as PricingStructure['offers'];
 const draft:PricingStructure={...seed,version:COMMERCIAL_VERSION,mode:'courses',offers,commercial:{referenceHours:8,referenceIndex:3,values,annualContentBps:2500,walletCentsPerLearner:10000,rentalRates:RENTAL_RATES.map(r=>({...r}))}};
 draft.commercial!.walletCentsPerLearner=Math.max(10000,draft.courses.reduce((sum,c)=>sum+courseValue(draft,c,'wallet').listCents,0));return draft;
}
export function valueIndex(scope:CreditCourse['scope'],level:number){integer(level,'audience/complexity level',1,5);return level+({public:1,industry:2,client:3}[scope]);}
export function courseValue(s:PricingStructure,c:CreditCourse,route:PurchaseRoute){
 const t=s.commercial!,v=t.values[c.editionId];if(!v)throw Error('Complete the commercial value for each selected course.');
 const weight=c.hours/t.referenceHours*valueIndex(c.scope,v.audienceLevel)/t.referenceIndex*v.marketMultiplierBps/10000;
 const listCents=up(s.offers[route].rateCents*weight);
 const floor=Math.max(c.minimumCents,s.cost.floors[c.scope]);
 return {weight,listCents:Math.max(listCents,floor),floor,level:v.audienceLevel,index:valueIndex(c.scope,v.audienceLevel)};
}
export function validateCommercial(s:PricingStructure){
 const t=s.commercial;if(!t||s.version!==COMMERCIAL_VERSION||s.cost.currency!=='USD')throw Error('The new commercial model currently requires a recorded USD cost version.');
 if(!['credits','courses'].includes(s.mode)||!['card','invoice'].includes(s.paymentMethod)||!['buyer','platform'].includes(s.feeBearer)||!s.company.id||['individual','seat_pack','wallet','subscription'].some(r=>!s.offers[r as PurchaseRoute]))throw Error('Choose valid buying conditions and all four options.');
 if(t.referenceHours!==8||t.referenceIndex!==3||JSON.stringify(t.rentalRates)!==JSON.stringify(RENTAL_RATES))throw Error('Use the central reference workload and platform-service rate card.');
 integer(t.annualContentBps,'annual content licence percentage',1,10000);integer(t.walletCentsPerLearner,'wallet purchasing value',1,100000000);
 if(!s.courses.length||s.courses.length>100||new Set(s.courses.map(c=>c.editionId)).size!==s.courses.length||s.courses.some(c=>c.currency!==s.cost.currency))throw Error('Select distinct eligible courses in the quoted currency.');
 for(const c of s.courses){const v=t.values[c.editionId];integer(v?.audienceLevel,'audience/complexity level',1,5);integer(v?.marketMultiplierBps,'documented market-value multiplier',1000,100000);creditUnits(c.hours);}
 if(t.walletCentsPerLearner<Math.min(...s.courses.map(c=>courseValue(s,c,'wallet').listCents)))throw Error('Increase the wallet purchasing value so at least one selected course can be redeemed.');
 for(const [route,o]of Object.entries(s.offers)){
  integer(o.rateCents,'reference-course price',1,10000000);integer(o.minSeats,'minimum places',1,1000);integer(o.maxSeats,'maximum places',o.minSeats,1000);integer(o.months,'access months',1,60);integer(o.courseCap,'selected course cap',1,s.courses.length);
  if(route==='individual'&&(o.minSeats!==1||o.maxSeats!==1||o.courseCap!==1))throw Error('An individual purchase is one named course for one learner.');
  if(route!=='individual'&&o.minSeats<10)throw Error('Group offers begin at ten named learners.');
  if(route==='subscription'&&(o.months!==12||o.courseCap>4))throw Error('Initial rental is twelve months with at most four selected courses. Additional courses need a separate co-terminating addition.');
  if(['subscription','seat_pack'].includes(route)&&s.courses.some(c=>!c.ownerIsApgi&&c.ownerId!==s.company.id&&c.minimumCents<=0)&&o.ownerAuthority.trim().length<5)throw Error('Record the external course owner’s licence/discount authority or an agreed owner minimum before discounting third-party content.');
  for(const c of s.courses){const a=o.shares[c.editionId];if(!a)throw Error('Complete recipient shares.');for(const v of Object.values(a))integer(v,'recipient share',0,10000);if(a.ownerBps+a.sellerBps+a.apgiBps!==10000)throw Error('Recipient shares must total 100%.');const d=allocation(0,c.ownerIsApgi,s.company.isApgi,c.ownerId===s.company.id);if(a.ownerBps!==d.ownerBps||a.sellerBps!==d.sellerBps||a.apgiBps!==d.apgiBps){if(o.exceptionReason.trim().length<10||o.ownerAuthority.trim().length<5)throw Error('Changed shares require a reason and course-owner authority.');}}
 }
}
export type CommercialBreakdown={balanceUnit:'learning-credits'|'purchasing-credits';scheduledDiscountBps:number;listContentCents:number;weight:number;serviceMarketCents:number;serviceCostFloorCents:number;annualContentBps:number;walletCentsPerLearner:number;lines:{editionId:string;title:string;scope:string;hours:number;learningCredits:number;weight:number;listCents:number;payableCents:number;floorCents:number;lineTotalCents:number;redemptionBaseCents:number;remainderLearners:number}[]};
export function commercialQuote(s:PricingStructure,route:PurchaseRoute,n:number,base:LegacyQuote):LegacyQuote&{commercial:CommercialBreakdown}{
 const o=s.offers[route],t=s.commercial!;integer(n,'quoted places',o.minSeats,o.maxSeats);
 const selected=route==='individual'?s.courses.slice(0,1):s.courses;
 if(selected.length>o.courseCap&&route!=='wallet')throw Error('The selected courses exceed this option’s course cap.');
 const discount=route==='seat_pack'?bulkDiscountBps(n):0;
 const lines=selected.map(c=>{const v=courseValue(s,c,route);const factor=route==='subscription'?t.annualContentBps:10000-discount;const lineTotal=route==='seat_pack'?Math.max(v.floor*n,up(v.listCents*n*factor/10000)):Math.max(v.floor,up(v.listCents*factor/10000))*n;return {editionId:c.editionId,title:c.title,scope:c.scope,hours:c.hours,learningCredits:c.hours/10,weight:v.weight,listCents:v.listCents,payableCents:up(lineTotal/n),floorCents:v.floor,lineTotalCents:lineTotal,redemptionBaseCents:Math.floor(lineTotal/n),remainderLearners:lineTotal%n};});
 const contentPerLearner=route==='wallet'?t.walletCentsPerLearner:lines.reduce((a,c)=>a+c.payableCents,0);
 const content=route==='wallet'?contentPerLearner*n:lines.reduce((a,c)=>a+c.lineTotalCents,0);
 const denominator=Math.max(20,s.cost.activeLearners,n);
 const weight=lines.reduce((a,c)=>a+c.weight,0),load=route==='subscription'?Math.max(1,weight/4):1;
 const floor=up(s.cost.monthlyPoolCents*o.months*n/denominator*load)+s.cost.variableCents*n;
 const market=route==='subscription'?up(rentalMonthlyCents(n,t.rentalRates)*12*n*load):0;
 const platform=Math.max(floor,market),sub=content+platform;
 const rate=s.paymentMethod==='invoice'?0:s.cost.processorBps,fixed=s.paymentMethod==='invoice'?0:s.cost.processorFixedCents;
 const total=s.feeBearer==='buyer'?up((sub+fixed)*10000/(10000-rate)):sub;
 integer(total,'buyer total',1,1000000000);
 const learningUnits=selected.reduce((a,c)=>a+creditUnits(c.hours),0);
 const units=route==='wallet'?contentPerLearner*10000:learningUnits;
 const list=lines.reduce((a,c)=>a+c.listCents,0)*n;
 const allCourses=selected.map((c,i)=>({...c,negotiatedShares:o.shares[c.editionId],commercialRedemptionCents:lines[i].redemptionBaseCents,commercialRedemptionRemainder:lines[i].remainderLearners,commercialLineTotalCents:lines[i].lineTotalCents,purchasingCreditCents:lines[i].payableCents,commercialWeight:lines[i].weight}));
 const single=selected.length===1&&!['wallet','subscription'].includes(route)?o.shares[selected[0].editionId]:null;
 const owner=single?Math.floor(content*single.ownerBps/10000):0,seller=single?Math.floor(content*single.sellerBps/10000):0;
 const info:CommercialBreakdown={balanceUnit:route==='wallet'?'purchasing-credits':'learning-credits',scheduledDiscountBps:discount,listContentCents:list,weight,serviceMarketCents:market,serviceCostFloorCents:floor,annualContentBps:t.annualContentBps,walletCentsPerLearner:t.walletCentsPerLearner,lines};
 return {...base,input:{...base.input,mode:route==='wallet'?'credits':'courses',route,seats:n,months:o.months,courseCap:o.courseCap,credits:units/1e6,scope:selected[0].scope,...{balanceUnit:info.balanceUnit}},cost:{...base.cost,activeLearners:denominator},courses:allCourses,result:{...base.result,units,credits:units/1e6,hours:route==='wallet'?0:learningUnits/100000,contentCents:content,platformCents:platform,buyerProcessingCents:total-sub,totalCents:total,estimatedProcessorCents:up(total*rate/10000)+fixed,allocation:single?{...single,owner,seller,apgi:content-owner-seller,sellerIsApgi:s.company.isApgi}:null,effectiveDiscountBps:route==='wallet'?0:Math.max(0,Math.floor((list-content)*10000/list)),structureVersion:s.version,policyVersion:COMMERCIAL_POLICY,denominator,floorBinding:route!=='wallet'&&lines.some(c=>c.payableCents===c.floorCents),...{balanceUnit:info.balanceUnit,scheduledDiscountBps:discount}},commercial:info};
}
export function rentalAddition(s:PricingStructure,course:CreditCourse,learners:number,start:string,end:string,addedAt:string){
 integer(learners,'affected learners',1,10000);const a=Date.parse(start),b=Date.parse(end),now=Date.parse(addedAt);
 if(![a,b,now].every(Number.isFinite)||b<=a||now<a||now>=b)throw Error('Choose an active term and addition date within it.');
 if(!s.courses.some(c=>c.editionId===course.editionId))throw Error('Use a selected, quoted eligible course edition.');
 const q=courseValue(s,course,'subscription'),fraction=(b-now)/(b-a);
 const floorPerYear=up(s.cost.monthlyPoolCents*12/Math.max(20,s.cost.activeLearners,learners));
 const rate=Math.max(rentalMonthlyCents(learners,s.commercial!.rentalRates)*12,floorPerYear);
 const service=up(learners*rate/4*q.weight*fraction);
 const content=Math.max(q.floor,up(q.listCents*s.commercial!.annualContentBps/10000))*learners;
 return {learners,course:course.title,remainingCalendarDays:(b-now)/86400000,termCalendarDays:(b-a)/86400000,weight:q.weight,serviceCents:service,contentCents:content,subtotalCents:service+content,endsAt:end,contentProrated:false};
}
