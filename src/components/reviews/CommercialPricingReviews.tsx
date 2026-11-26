import Link from 'next/link';
import {pricingReviewsForCourse} from '@/server/services/review-requests';
import type {ReviewRequest} from '@/lib/review-requests';

function PricingReviewLinks({requests}:{requests:ReviewRequest[]}){
 return <ul>{requests.map(r=><li key={r.id}>
  <Link href={`/review-requests/${r.id}`}>{r.reviewer_email} · {r.snapshot.pricing?.fingerprint.slice(0,12)}</Link>
  {' · '}{r.superseded_by?'Superseded':r.response?.decisions['course-pricing']==='approve'?'Approved':r.response?'Changes requested':r.state==='closed'?'Closed':'Awaiting review'}
 </li>)}</ul>;
}

export async function CommercialPricingReviews({company,course}:{company:string;course:string}){
 const requests=await pricingReviewsForCourse(company,course);
 if(!requests.length)return null;
 const current=requests.filter(r=>!r.superseded_by),earlier=requests.filter(r=>r.superseded_by);
 return <section className="admin-form-card" id="submitted-course-pricing">
  <h2>Submitted course pricing</h2>
  {current.length?<><p>Open the current proposal to test the buyer’s prices and sign off the exact terms.</p><PricingReviewLinks requests={current}/></>:null}
  {earlier.length?<details><summary>Earlier pricing reviews ({earlier.length})</summary><PricingReviewLinks requests={earlier}/></details>:null}
 </section>;
}
