import {allocation,creditUnits,integer,type CourseScope} from './course-calculator';
import type {CreditCourse} from './credit-course-metadata';
import {bulkDiscountBps,courseValue} from './commercial-pricing';
import type {PricingStructure} from './pricing-structures';

export const CATEGORY_WALLET_VERSION='category-wallet-2026-11-18.1';
export const CATEGORY_WALLET_POLICY='APGI-COMM-PRICE-001/1.4-draft';
export type CategoryWallet={version:typeof CATEGORY_WALLET_VERSION;categories:CourseScope[];catalogue:CreditCourse[];defaultFaceCents:number;minFaceCents:number;maxFaceCents:number};
export type WalletPurchase={faceCents:number;categories:CourseScope[]};
export type WalletFunding={position:number;faceCents:number;cashCents:number};
const scopes:CourseScope[]=['public','industry','client'];
const ceilRatio=(a:number,b:number,d:number)=>Number((BigInt(a)*BigInt(b)+BigInt(d)-BigInt(1))/BigInt(d));

export function walletCourses(s:PricingStructure,categories=s.categoryWallet?.categories??[]){
 const w=s.categoryWallet;if(!w||w.version!==CATEGORY_WALLET_VERSION)throw Error('Choose the category wallet model.');
 if(!categories.length||new Set(categories).size!==categories.length||categories.some(c=>!scopes.includes(c)||!w.categories.includes(c)))throw Error('Choose one or more approved wallet categories.');
 return w.catalogue.filter(c=>categories.includes(c.scope));
}
export function walletAverage(s:PricingStructure,categories=s.categoryWallet?.categories??[]){
 const courses=walletCourses(s,categories);if(!courses.length)throw Error('No published eligible courses are available in these categories.');
 const sumCents=courses.reduce((n,c)=>n+courseValue(s,c,'wallet').listCents,0);
 return {courses,count:courses.length,sumCents,averageCents:sumCents/courses.length,byCategory:scopes.filter(scope=>categories.includes(scope)).map(scope=>{const list=courses.filter(c=>c.scope===scope);return {scope,count:list.length,averageCents:list.length?list.reduce((n,c)=>n+courseValue(s,c,'wallet').listCents,0)/list.length:0};})};
}
export function withCategoryWallet(s:PricingStructure,catalogue:CreditCourse[]):PricingStructure{
 const categories=[...new Set(catalogue.map(c=>c.scope))],values={...s.commercial!.values},shares={...s.offers.wallet.shares};
 for(const c of catalogue){values[c.editionId]??={audienceLevel:c.courseId==='vpshr-level-0'?2:c.scope==='client'?4:3,marketMultiplierBps:10000};const a=allocation(0,c.ownerIsApgi,s.company.isApgi,c.ownerId===s.company.id);shares[c.editionId]??={ownerBps:a.ownerBps,sellerBps:a.sellerBps,apgiBps:a.apgiBps};}
 const next:PricingStructure={...s,commercial:{...s.commercial!,values},offers:{...s.offers,wallet:{...s.offers.wallet,minSeats:1,maxSeats:1000,courseCap:Math.max(1,catalogue.length),shares}},categoryWallet:{version:CATEGORY_WALLET_VERSION,categories,catalogue:catalogue.map(c=>({...c})),defaultFaceCents:10000,minFaceCents:100,maxFaceCents:100000000}};
 if(catalogue.length){const a=walletAverage(next);next.categoryWallet!.minFaceCents=Math.ceil(Math.min(...a.courses.map(c=>courseValue(next,c,'wallet').listCents))/100)*100;next.categoryWallet!.defaultFaceCents=Math.max(next.categoryWallet!.minFaceCents,Math.ceil(a.averageCents/100)*100);}
 return next;
}
export function setWalletCategories(s:PricingStructure,categories:CourseScope[]):PricingStructure{
 const w=s.categoryWallet!;const next={...s,categoryWallet:{...w,categories:scopes.filter(c=>categories.includes(c))}};
 if(categories.length){const a=walletAverage(next);next.categoryWallet.minFaceCents=Math.ceil(Math.min(...a.courses.map(c=>courseValue(next,c,'wallet').listCents))/100)*100;next.categoryWallet.defaultFaceCents=Math.max(next.categoryWallet.minFaceCents,w.defaultFaceCents);}
 return next;
}
export function validateCategoryWallet(s:PricingStructure){
 const w=s.categoryWallet!;if(w.version!==CATEGORY_WALLET_VERSION||w.catalogue.length>100||new Set(w.catalogue.map(c=>c.editionId)).size!==w.catalogue.length)throw Error('Choose a distinct frozen wallet catalogue of up to 100 published courses.');
 integer(w.minFaceCents,'minimum wallet purchasing value',100,100000000);integer(w.maxFaceCents,'maximum wallet purchasing value',w.minFaceCents,100000000);integer(w.defaultFaceCents,'default wallet purchasing value',w.minFaceCents,w.maxFaceCents);
 for(const c of w.catalogue){const v=s.commercial!.values[c.editionId];integer(v?.audienceLevel,'wallet audience/complexity level',1,5);integer(v?.marketMultiplierBps,'wallet market-value multiplier',1000,100000);creditUnits(c.hours);}
 for(const c of w.catalogue){if(c.currency!==s.cost.currency||!scopes.includes(c.scope))throw Error('Wallet currency/category must match the recorded course.');if(!c.ownerIsApgi&&c.ownerId!==s.company.id&&c.minimumCents<=0&&s.offers.wallet.ownerAuthority.trim().length<5)throw Error('Record the external course owner’s wallet-discount authority or protected minimum.');const v=courseValue(s,c,'wallet'),a=s.offers.wallet.shares[c.editionId];if(!a||Object.values(a).some(n=>!Number.isSafeInteger(n)||n<0)||a.ownerBps+a.sellerBps+a.apgiBps!==10000)throw Error('Complete each wallet course allocation.');const d=allocation(0,c.ownerIsApgi,s.company.isApgi,c.ownerId===s.company.id);if((a.ownerBps!==d.ownerBps||a.sellerBps!==d.sellerBps||a.apgiBps!==d.apgiBps)&&(s.offers.wallet.exceptionReason.trim().length<10||s.offers.wallet.ownerAuthority.trim().length<5))throw Error('Wallet share changes require a reason and owner authority.');if(v.floor>v.listCents)throw Error('The wallet course value must cover its protected minimum.');}
 walletAverage(s);
}
export function walletFunding(s:PricingStructure,faceCents:number,learners:number,categories?:CourseScope[]){
 const a=walletAverage(s,categories),w=s.categoryWallet!;
 integer(faceCents,'purchasing credits',w.minFaceCents,w.maxFaceCents);if(faceCents%100)throw Error('Purchase whole dollar-value credits.');integer(learners,'named learner capacity',s.offers.wallet.minSeats,s.offers.wallet.maxSeats);
 const values=a.courses.map(c=>courseValue(s,c,'wallet')),base=Math.floor(faceCents/learners),remainder=faceCents%learners;
 if(base<Math.min(...values.map(v=>v.listCents)))throw Error('Increase purchasing credits or reduce learner capacity so each named place can afford an eligible course.');
 const equivalent=Number(BigInt(faceCents)*BigInt(a.count)/BigInt(a.sumCents)),scheduled=equivalent>=10?bulkDiscountBps(Math.min(10000,equivalent)):0;
 const seats:WalletFunding[]=Array.from({length:learners},(_,i)=>{const face=base+(i<remainder?1:0);return {position:i+1,faceCents:face,cashCents:Math.max(Math.ceil(face/2),...values.map(v=>ceilRatio(face,v.floor,v.listCents)))};});
 const minimum=seats.reduce((n,s)=>n+s.cashCents,0),paid=Math.max(ceilRatio(faceCents,10000-scheduled,10000),minimum),extra=paid-minimum,capacity=faceCents-minimum;
 let usedCapacity=0,distributed=0;for(const seat of seats){usedCapacity+=seat.faceCents-seat.cashCents;const portion=capacity?Number(BigInt(extra)*BigInt(usedCapacity)/BigInt(capacity)):0;seat.cashCents+=portion-distributed;distributed=portion;}
 return {...a,faceCents,cashCents:paid,courseEquivalents:equivalent,estimatedCourses:faceCents*a.count/a.sumCents,scheduledDiscountBps:scheduled,effectiveDiscountBps:Math.floor((faceCents-paid)*10000/faceCents),floorBinding:paid>ceilRatio(faceCents,10000-scheduled,10000),seats};
}
export function categoryWalletQuote(s:PricingStructure,learners:number,purchase?:WalletPurchase){
 const w=s.categoryWallet!,categories=scopes.filter(c=>(purchase?.categories??w.categories).includes(c));
 if(purchase?.categories&&categories.length!==purchase.categories.length)throw Error('Choose distinct valid wallet categories.');
 const f=walletFunding(s,purchase?.faceCents??w.defaultFaceCents,learners,categories),o=s.offers.wallet,cost=s.cost;
 const denominator=Math.max(20,cost.activeLearners,learners),platform=Math.ceil(cost.monthlyPoolCents*o.months*learners/denominator)+cost.variableCents*learners,subtotal=f.cashCents+platform;
 const rate=s.paymentMethod==='invoice'?0:cost.processorBps,fixed=s.paymentMethod==='invoice'?0:cost.processorFixedCents,total=s.feeBearer==='buyer'?ceilRatio(subtotal+fixed,10000,10000-rate):subtotal;integer(total,'wallet total',1,1000000000);
 const lines=f.courses.map(c=>{const v=courseValue(s,c,'wallet');return {editionId:c.editionId,title:c.title,scope:c.scope,hours:c.hours,learningCredits:c.hours/10,weight:v.weight,listCents:v.listCents,payableCents:v.listCents,floorCents:v.floor,lineTotalCents:v.listCents,redemptionBaseCents:v.listCents,remainderLearners:0};});
 const input={mode:'credits' as const,route:'wallet' as const,scope:f.courses[0].scope,seats:learners,months:o.months,credits:f.faceCents/100,courseCap:f.count,driver:'credits' as const,deliveryCents:0,deliveryEvidence:'',feeBearer:s.feeBearer,discount:true,balanceUnit:'purchasing-credits',walletPurchase:{version:CATEGORY_WALLET_VERSION,faceCents:f.faceCents,categories,primaryCourseId:s.courses[0].courseId}};
 return {input,cost:{...cost,activeLearners:denominator},courses:f.courses.map((c,i)=>({...c,categoryWalletVersion:CATEGORY_WALLET_VERSION,negotiatedShares:o.shares[c.editionId],commercialRedemptionCents:lines[i].listCents,walletRedemptionCreditCents:lines[i].listCents,walletMinimumCents:lines[i].floorCents,purchasingCreditCents:lines[i].listCents,commercialRedemptionRemainder:0,commercialLineTotalCents:lines[i].listCents,commercialWeight:lines[i].weight})),
 result:{version:'2026-11-16.1',currency:cost.currency,units:f.faceCents*10000,credits:f.faceCents/100,hours:0,contentCents:f.cashCents,platformCents:platform,buyerProcessingCents:total-subtotal,totalCents:total,estimatedProcessorCents:Math.ceil(total*rate/10000)+fixed,allocation:null,recipientBps:0,effectiveDiscountBps:f.effectiveDiscountBps,monthlyRecoveryAtForecastCents:Math.ceil(cost.monthlyPoolCents*o.months*cost.newEnrolments/denominator),monthlyRecoveryDifferenceCents:Math.ceil(cost.monthlyPoolCents*o.months*cost.newEnrolments/denominator)-cost.monthlyPoolCents,requiresClientQuote:categories.includes('client')&&learners>50,prepaid:true,taxIncluded:false,structureVersion:s.version,policyVersion:CATEGORY_WALLET_POLICY,denominator,floorBinding:f.floorBinding,internalResidualSplit:'50/50 unchanged',balanceUnit:'purchasing-credits',walletFunding:{version:CATEGORY_WALLET_VERSION,faceCents:f.faceCents,cashCents:f.cashCents,seats:f.seats,averageCents:f.averageCents,courseEquivalents:f.courseEquivalents,estimatedCourses:f.estimatedCourses,categories,byCategory:f.byCategory},scheduledDiscountBps:f.scheduledDiscountBps},
 commercial:{balanceUnit:'purchasing-credits' as const,scheduledDiscountBps:f.scheduledDiscountBps,listContentCents:f.faceCents,weight:lines.reduce((n,l)=>n+l.weight,0),serviceMarketCents:0,serviceCostFloorCents:platform,annualContentBps:s.commercial!.annualContentBps,walletCentsPerLearner:f.faceCents/learners,lines}};
}
