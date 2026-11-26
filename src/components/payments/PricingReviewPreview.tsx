import {ROUTES} from '@/lib/pricing-structures';
import {reviewQuantities,shopOffer,type PricingReview} from '@/lib/pricing-review';
import {CourseShop} from './CourseShop';
import {CategoryWalletShop} from './CategoryWalletShop';

export function PricingReviewPreview({review}:{review:PricingReview}){
 const {structure,primaryCourseId,planningOnly,quantities}=review;
 const wallet=structure.categoryWallet;
 const counts=reviewQuantities(structure,quantities);
 const offers=ROUTES.filter(route=>route!=='wallet'||!wallet).map(route=>shopOffer(structure,route));
 return <section className="admin-form-card">
  <h2>Buyer portal pricing preview</h2>
  <p><strong>{structure.courses[0].title}</strong> · {structure.paymentMethod==='invoice'?'Prepaid bank invoice':'Sandbox card'} · {structure.feeBearer==='buyer'?'Buyer covers processing provision':'Platform covers processing'}</p>
  <p>Move the sliders to review prices within the submitted terms. {planningOnly?'This proposal uses planning estimates. Buyer publication requires verified course and platform cost records.':'The review decision applies to the entire submitted price structure.'}</p>
  <CourseShop company={structure.company.id} course={primaryCourseId} currency={structure.cost.currency} offers={offers} reviewQuantities={counts}>
   {wallet?<CategoryWalletShop company={structure.company.id} course={primaryCourseId} manager reviewPricing={structure} reviewLearners={counts.wallet} terms={{categories:wallet.categories,defaultFaceCents:wallet.defaultFaceCents,minFaceCents:wallet.minFaceCents,maxFaceCents:wallet.maxFaceCents,maxLearners:structure.offers.wallet.maxSeats}}/>:null}
  </CourseShop>
  <details><summary>Submitted cost basis, offer terms and recipient allocations</summary><pre className="review-request-document">{JSON.stringify(structure,null,2)}</pre></details>
 </section>;
}
