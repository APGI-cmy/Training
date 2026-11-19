import {allocation,integer,type PurchaseRoute} from './course-calculator';
import {quoteStructure,type PricingStructure} from './pricing-structures';

// Snapshot = the owner's published price structure, never a recipient's form data.
// A discount consumes only selling margin. Costs, owner/APGI amounts and the
// internal APGI/SRMS allocation are unchanged at every route and quantity.
export function sharedCourseQuote(snapshot:PricingStructure,recipient:{id:string;isApgi:boolean},route:PurchaseRoute,quantity:number,retainedBps=10000){
 integer(retainedBps,'retained partner margin',0,10000);
 if(snapshot.courses.length!==1)throw Error('An approved single-course distribution schedule is required.');
 const copy=structuredClone(snapshot),course=copy.courses[0];
 copy.company=recipient;
 const shares=allocation(0,course.ownerIsApgi,recipient.isApgi,course.ownerId===recipient.id);
 for(const offer of Object.values(copy.offers))offer.shares[course.editionId]={ownerBps:shares.ownerBps,sellerBps:shares.sellerBps,apgiBps:shares.apgiBps};
 // A category wallet needs its separately approved category-wide distribution
 // matrix. Do not turn a one-course licence into unrestricted wallet access.
 if(route==='wallet'&&copy.categoryWallet)throw Error('Category wallet distribution requires an approved category-wide rights schedule.');
 const quote=quoteStructure(copy,route,quantity),r=quote.result;
 const owner=Math.floor(r.contentCents*shares.ownerBps/10000),seller=Math.floor(r.contentCents*shares.sellerBps/10000),apgi=r.contentCents-owner-seller;
 const absorbedFee=copy.feeBearer==='platform'?r.estimatedProcessorCents:0;
 if(absorbedFee>seller)throw Error('This schedule does not leave sufficient selling margin to absorb processing without reducing fixed obligations.');
 const spendable=seller-absorbedFee,retained=Math.floor(spendable*retainedBps/10000),discount=spendable-retained;
 // Keep the full approved processing provision; reductions cannot shift fees to APGI.
 return {...quote,locked:{ownerCents:owner,apgiCents:apgi,platformCents:r.platformCents,processingCents:r.buyerProcessingCents,absorbedFeeReserveCents:absorbedFee,originalSellerCents:seller,sellerCents:retained,discountCents:discount,totalCents:r.totalCents-discount,retainedBps,internalSplit:'APGI/SRMS 50/50 unchanged'}};
}
