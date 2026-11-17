import {integer} from './course-calculator';
import {quoteStructure,type PricingStructure,type StructureQuote} from './pricing-structures';
import {COMMERCIAL_VERSION,courseValue} from './commercial-pricing';
export type RentalAdditionBasis={originalOrderId:string;parentSeatIds:string[];termStart:string;termEnd:string;addedAt:string;originalPlaces:number;originalServiceCents:number};
export function quoteRentalAddition(s:PricingStructure,b:RentalAdditionBasis):StructureQuote{
 if(s.version!==COMMERCIAL_VERSION||!s.courses.length)throw Error('Choose an approved course for the rental addition.');
 const ids=[...new Set(b.parentSeatIds)].sort();if(!ids.length||ids.length!==b.parentSeatIds.length)throw Error('Choose distinct assigned learner places.');
 integer(b.originalPlaces,'original rental places',10,1000);integer(b.originalServiceCents,'original annual platform amount',1,1000000000);
 if(ids.length>b.originalPlaces)throw Error('Affected learners exceed the original agreement.');
 const start=Date.parse(b.termStart),end=Date.parse(b.termEnd),added=Date.parse(b.addedAt);
 if(![start,end,added].every(Number.isFinite)||end<=start||added<start||added>=end)throw Error('The addition must start inside the original rental term.');
 const single={...s,courses:s.courses.slice(0,1),offers:{...s.offers,subscription:{...s.offers.subscription,courseCap:1}}};
 const base=quoteStructure(single,'subscription',Math.max(10,ids.length)),c=s.courses[0],value=courseValue(s,c,'subscription');
 const fraction=(end-added)/(end-start),platform=Math.ceil(b.originalServiceCents/b.originalPlaces/4*value.weight*fraction*ids.length);
 const unit=Math.max(value.floor,Math.ceil(value.listCents*s.commercial!.annualContentBps/10000)),content=unit*ids.length,subtotal=platform+content;
 const fixed=s.paymentMethod==='invoice'?0:s.cost.processorFixedCents,rate=s.paymentMethod==='invoice'?0:s.cost.processorBps;
 const total=s.feeBearer==='buyer'?Math.ceil((subtotal+fixed)*10000/(10000-rate)):subtotal;
 integer(total,'addition total',1,1000000000);
 const basis={originalOrderId:b.originalOrderId,parentSeatIds:ids,termStart:b.termStart,termEnd:b.termEnd,addedAt:b.addedAt,originalPlaces:b.originalPlaces,originalServiceCents:b.originalServiceCents};
 return {...base,input:{...base.input,seats:ids.length,courseCap:1,...{rentalAddition:basis}},courses:base.courses.map(c=>({...c,commercialRedemptionCents:unit,commercialRedemptionRemainder:0,commercialLineTotalCents:content,purchasingCreditCents:unit})),result:{...base.result,contentCents:content,platformCents:platform,buyerProcessingCents:total-subtotal,totalCents:total,estimatedProcessorCents:Math.ceil(total*rate/10000)+fixed,...{rentalAddition:basis,endsAt:b.termEnd}},commercial:base.commercial?{...base.commercial,serviceMarketCents:platform,serviceCostFloorCents:0,lines:base.commercial.lines.map(line=>({...line,payableCents:unit,lineTotalCents:content,redemptionBaseCents:unit,remainderLearners:0}))}:undefined};
}
