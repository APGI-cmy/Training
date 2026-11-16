export const CALCULATOR_VERSION = '2026-11-16.1';
export type PurchaseRoute = 'individual' | 'seat_pack' | 'wallet' | 'subscription';
export type CourseScope = 'public' | 'industry' | 'client';
export type CreditCourse = {id:string;editionId:string;courseId:string;title:string;ownerId:string;ownerIsApgi:boolean;scope:CourseScope;hours:number;minimumCents:number;currency:string;evidence:string};
export type CostSchedule = {id:string;currency:string;monthlyPoolCents:number;activeLearners:number;newEnrolments:number;variableCents:number;processorBps:number;processorFixedCents:number;source:string;sourceDraftId:string;rates:Record<CourseScope,number>;floors:Record<CourseScope,number>;margins:Record<CourseScope,number>};
export type CalculatorInput = {mode:'credits'|'courses';route:PurchaseRoute;scope:CourseScope;seats:number;months:number;credits:number;courseCap:number;driver:'credits'|'cost_plus';deliveryCents:number;deliveryEvidence:string;feeBearer:'platform'|'buyer';discount:boolean};
export function integer(n:number,label:string,min=0,max=1000000000){if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`Check ${label}.`);return n;}
function up(n:number,d=1){return Math.ceil(n/d);}
export function creditUnits(hours:number){if(!Number.isFinite(hours)||hours<=0||hours>100000||Math.round(hours*100000)<1||Math.abs(hours*100000-Math.round(hours*100000))>0.00001)throw Error('Record justified learning hours (up to five decimal places).');return Math.round(hours*100000);}
export function allocation(content:number,ownerIsApgi:boolean,sellerIsApgi:boolean,sameCompany:boolean){
 integer(content,'content amount');
 // The APGI-course resale exception is explicit: seller80 / APGI20.
 const ownerBps=sameCompany?8000:ownerIsApgi?0:8000;
 const sellerBps=sameCompany?0:ownerIsApgi?8000:1000;
 const apgiBps=10000-ownerBps-sellerBps;
 const owner=Math.floor(content*ownerBps/10000),seller=Math.floor(content*sellerBps/10000);
 return {owner,seller,apgi:content-owner-seller,ownerBps,sellerBps,apgiBps,sellerIsApgi};
}
function progressive(rate:number,units:number,seats:number,scope:CourseScope){
 const bands=scope==='client'?[[Infinity,10000]]:scope==='public'?[[50,10000],[100,9200],[Infinity,8400]]:[[50,10000],[100,9200],[350,8400],[500,7600],[1000,7000],[Infinity,6800]];
 let left=seats,total=BigInt(0);for(const [size,factor]of bands){const count=Math.min(left,size);total+=BigInt(rate)*BigInt(units)*BigInt(count)*BigInt(factor);left-=count;if(!left)break;}return Number((total+BigInt(9999999999))/BigInt(10000000000));
}
function discountBps(seats:number){return seats>=1000?2000:seats>=500?1800:seats>=150?1500:seats>=50?1000:seats>=10?500:0;}
export function calculateCoursePrice(input:CalculatorInput,cost:CostSchedule,courses:CreditCourse[],seller:{id:string;isApgi:boolean}){
 if(!['credits','courses'].includes(input.mode)||!['individual','seat_pack','wallet','subscription'].includes(input.route)||!['public','industry','client'].includes(input.scope)||!['credits','cost_plus'].includes(input.driver)||!['platform','buyer'].includes(input.feeBearer))throw Error('Choose valid calculator options.');
 if(typeof input.discount!=='boolean'||typeof input.deliveryEvidence!=='string')throw Error('Check the discount and direct cost evidence.');
 integer(input.seats,'learner places',1,10000);integer(input.months,'access months',1,60);integer(input.courseCap,'course limit',1,1000);
 if(input.route==='individual'&&input.seats!==1)throw Error('An individual course is for exactly one learner.');
 if(input.route!=='individual'&&input.seats<10)throw Error('Group purchases require at least ten learner places.');
 if(['individual','seat_pack'].includes(input.route)&&(courses.length!==1||input.courseCap!==1))throw Error('Choose one named course with a one-course limit.');
 if(!courses.length||new Set(courses.map(c=>c.editionId)).size!==courses.length)throw Error('Choose distinct eligible course editions.');
 if(courses.some(c=>c.currency!==cost.currency||c.scope!==input.scope))throw Error('The course scope and currency must match the approved records.');
 integer(cost.monthlyPoolCents,'shared monthly costs');integer(cost.activeLearners,'expected active learners',1,1000000);integer(cost.newEnrolments,'new monthly enrolments',1,1000000);integer(cost.variableCents,'cost per enrolment');integer(cost.processorBps,'processing rate',0,9999);integer(cost.processorFixedCents,'processing fixed fee');
 for(const s of ['public','industry','client'] as const){integer(cost.rates[s],'credit rate',1);integer(cost.floors[s],'minimum content price',1);integer(cost.margins[s],'target margin',0,9500);}
 if(!cost.source.trim()||!cost.sourceDraftId)throw Error('Choose a documented platform-cost snapshot.');
 const selectedUnits=courses.reduce((n,c)=>{integer(c.minimumCents,'owner minimum price');return n+creditUnits(c.hours);},0);
 const units=input.mode==='courses'?selectedUnits:creditUnits(input.credits*10);
 if(['individual','seat_pack'].includes(input.route)&&units!==selectedUnits)throw Error('A named course uses its recorded credits without extra-course allowances.');
 if(!courses.some(c=>creditUnits(c.hours)<=units))throw Error('The allowance cannot cover any selected course.');
 if(input.courseCap>courses.length)throw Error('The course limit cannot exceed the selected course set.');
 const usableUnits=courses.map(c=>creditUnits(c.hours)).sort((a,b)=>b-a).slice(0,input.courseCap).reduce((n,u)=>n+u,0);
 if(units>usableUnits)throw Error('The allowance exceeds the courses that can be used within this course limit. Add eligible courses or increase the course limit.');
 const requestedDiscount=input.discount?discountBps(input.seats):0;
 const list=progressive(cost.rates[input.scope],units,input.seats,input.scope);
 const ownerMinimum=['individual','seat_pack'].includes(input.route)?courses[0].minimumCents*input.seats:Math.max(...courses.map(c=>Number((BigInt(c.minimumCents)*BigInt(units)+BigInt(creditUnits(c.hours))-BigInt(1))/BigInt(creditUnits(c.hours)))))*input.seats;
 const priceFloor=Math.max(ownerMinimum,cost.floors[input.scope]*input.seats);
 let content=Math.max(up(list*(10000-requestedDiscount),10000),priceFloor);
 const shares=courses.map(c=>allocation(10000,c.ownerIsApgi,seller.isApgi,c.ownerId===seller.id));
 const recipientBps=Math.min(...shares.map((s,i)=>(courses[i].ownerId===seller.id?s.ownerBps:0)+s.sellerBps+(seller.isApgi?s.apgiBps:0)));
 if(input.driver==='cost_plus'){
  integer(input.deliveryCents,'documented direct costs',1);if(input.deliveryEvidence.trim().length<5)throw Error('Record the evidence for known or estimated direct costs.');
  if(recipientBps===0)throw Error('Cost-plus requires a defined recipient share.');
  // Direct cost is supplied explicitly, never inferred from an earlier price.
  const divisor=BigInt(recipientBps*(10000-cost.margins[input.scope]));
  content=Math.max(priceFloor,Number((BigInt(input.deliveryCents)*BigInt(100000000)+divisor-BigInt(1))/divisor));
 }
 integer(content,'content charge',1,1000000000);
 // Monthly costs use concurrent active learners. Per-enrolment costs are charged once.
 const platform=up(cost.monthlyPoolCents*input.months*input.seats,cost.activeLearners)+cost.variableCents*input.seats;
 const subtotal=content+platform;
 const total=input.feeBearer==='buyer'?up((subtotal+cost.processorFixedCents)*10000,10000-cost.processorBps):subtotal;
 integer(total,'buyer total',1,1000000000);
 const estimatedProcessor=up(total*cost.processorBps,10000)+cost.processorFixedCents;
 const owner=courses.length===1?allocation(content,courses[0].ownerIsApgi,seller.isApgi,courses[0].ownerId===seller.id):null;
 return {version:CALCULATOR_VERSION,currency:cost.currency,units,credits:units/1e6,hours:units/100000,contentCents:content,platformCents:platform,buyerProcessingCents:total-subtotal,totalCents:total,estimatedProcessorCents:estimatedProcessor,estimatedPlatformNetCents:platform+(owner?.apgi??0)-(input.feeBearer==='platform'?estimatedProcessor:0),allocation:owner,recipientBps,effectiveDiscountBps:input.driver==='credits'&&list?Math.max(0,Math.floor((list-content)*10000/list)):0,monthlyRecoveryAtForecastCents:up(cost.monthlyPoolCents*input.months*cost.newEnrolments,cost.activeLearners),monthlyRecoveryDifferenceCents:up(cost.monthlyPoolCents*input.months*cost.newEnrolments,cost.activeLearners)-cost.monthlyPoolCents,requiresClientQuote:input.scope==='client'&&input.seats>50,prepaid:['wallet','subscription'].includes(input.route),policyVersion:'APGI-COMM-PRICE-001/1.1-draft',taxIncluded:false};
}
