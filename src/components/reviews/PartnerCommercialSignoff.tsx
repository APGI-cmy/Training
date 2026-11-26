import Link from 'next/link';
import type {CompanyRecord} from '@/lib/company-structure';
import type {ReviewRound} from '@/lib/course-review';
import {calculatorAccess,calculatorCourses,calculatorWalletCourses} from '@/server/services/course-calculator';
import {calculatorPlanningPreview} from '@/server/services/calculator-planning-preview';
import {pricingReviewsForCourse} from '@/server/services/review-requests';
import {rows} from '@/server/services/company-structure';
import {partnerRetainer} from '@/server/services/partner-commercial-terms';
import {shareableCost} from '@/server/services/pricing-structures';
import {defaultStructure} from '@/lib/pricing-structures';
import {withCategoryWallet} from '@/lib/category-wallet';
import {COMPARISON_QUANTITIES} from '@/lib/partner-commercial-terms';
import type {CostSchedule} from '@/lib/course-calculator';
import {PartnerCommercialSummary} from './PartnerCommercialSummary';
import {ReviewRequestResponse} from './ReviewRequestControls';

export async function PartnerCommercialSignoff({round,company,email}:{round:ReviewRound;company:CompanyRecord;email:string}){
 const [requests,access]=await Promise.all([
  pricingReviewsForCourse(company.id,round.course_id),
  calculatorAccess(company.id).catch(()=>null),
 ]);
 const current=requests.filter(r=>!r.superseded_by&&r.snapshot.pricing);
 const earlier=requests.filter(r=>r.superseded_by);
 const submitted=current[0]?.snapshot.pricing;
 const preview=!submitted&&access?await calculatorPlanningPreview(company):null;
 const canPrepare=access?.priceEditor||!!preview&&access?.principal||!!submitted?.planningOnly&&access?.principal;
 let structure=submitted?.structure;
 if(!structure&&canPrepare){
  const target={id:company.id,isApgi:false};
  if(preview)structure=withCategoryWallet(defaultStructure(preview.costs[0],preview.courses,target),preview.courses);
  else{
   const [catalogue,wallet,costs]=await Promise.all([
    calculatorCourses(company.id),calculatorWalletCourses(company.id),
    rows<{id:string;snapshot:CostSchedule}>('/rest/v1/cc_cost_versions?snapshot->>currency=eq.USD&select=id,snapshot&order=created_at.desc&limit=1'),
   ]);
   const course=catalogue.courses.find(c=>c.courseId===round.course_id&&c.currency==='USD'),cost=costs[0];
   if(course&&cost)structure=withCategoryWallet(defaultStructure(shareableCost(cost.id,cost.snapshot),[course],target),wallet);
  }
 }
 const myReview=current.find(r=>r.reviewer_email===email);
 const retainer=submitted?.retainer??(structure?await partnerRetainer(company,round.course_id):undefined);
 const revise=`/course-calculator?company=${company.id}&review=${round.id}`;
 return <section id="submitted-course-pricing" className="review-box">
  <h2>Commercial preparation and sign-off</h2>
  {canPrepare?<Link className="primary-button" href={revise}>Prepare a revised commercial version</Link>:null}
  {structure?<><p>{submitted?(submitted.planningOnly?'Submitted planning proposal':'Submitted proposal'):`Draft price preview · ${company.name}`}</p><PartnerCommercialSummary key={submitted?.fingerprint??round.id} structure={structure} quantities={submitted?.quantities??COMPARISON_QUANTITIES} company={company.name} retainer={retainer}/></>
   :<p>A course price has not been submitted. <Link href={`/course-sharing?company=${company.id}`}>View shared course pricing</Link>.</p>}
  {current.length?<section className="review-box"><h3>Commercial sign-off</h3><ul>{current.map(r=><li key={r.id}><Link href={`/review-requests/${r.id}`}>{r.reviewer_email}</Link> · {r.response?.decisions['course-pricing']==='approve'?'Approved':r.response?'Changes requested':r.state==='closed'?'Closed':'Awaiting review'}</li>)}</ul>
   {myReview?.state==='open'&&Date.parse(myReview.deadline)>Date.now()?<ReviewRequestResponse request={myReview}/>:null}
  </section>:<p>Submit a proposal from the course calculator to request sign-off.</p>}
  {earlier.length?<details><summary>Earlier pricing reviews ({earlier.length})</summary><ul>{earlier.map(r=><li key={r.id}><Link href={`/review-requests/${r.id}`}>{r.reviewer_email} · {r.snapshot.pricing?.fingerprint.slice(0,12)}</Link></li>)}</ul></details>:null}
 </section>;
}
