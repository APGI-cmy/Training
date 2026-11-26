'use client';
import {useState} from 'react';
import type {PurchaseRoute} from '@/lib/course-calculator';
import {moneyLabel,offerCourses,quoteStructure,ROUTES,ROUTE_NAMES,type PricingStructure} from '@/lib/pricing-structures';
import {monthlyLearnerCents} from '@/lib/course-selection';
import {reviewQuantities} from '@/lib/pricing-review';

export function CommercialPriceCards({structure,quantities}:{structure:PricingStructure;quantities:Record<PurchaseRoute,number>}){
 const counts=reviewQuantities(structure,quantities);
 return <div className="pricing-cards">{ROUTES.map(route=><CommercialPriceCard key={route} structure={structure} route={route} startingCount={counts[route]}/>)}</div>;
}

function CommercialPriceCard({structure,route,startingCount}:{structure:PricingStructure;route:PurchaseRoute;startingCount:number}){
 const terms=structure.offers[route],wallet=route==='wallet'?structure.categoryWallet:undefined;
 const [count,setCount]=useState(startingCount);
 const [creditCents,setCreditCents]=useState(wallet?.defaultFaceCents??0);
 const title=ROUTE_NAMES[route],currency=structure.cost.currency;
 const courses=wallet&&!wallet.catalogue.length?[]:offerCourses(structure,route);
 if(!courses.length)return <article className="directory-card"><h3>{title}</h3><p>A published eligible course is needed for wallet pricing.</p></article>;
 let quote;try{quote=quoteStructure(structure,route,count,wallet?{faceCents:creditCents,categories:wallet.categories}:undefined);}catch{/* Some wallet funding levels can be below the frozen minimum per learner. */}
 return <article className="directory-card">
  <h3>{title}</h3>
  <p>{courses.map(course=>course.title).join(' · ')}</p>
  {wallet?<label className="pricing-quantity">Purchasing credits <strong>{(creditCents/100).toLocaleString()}</strong>
   <input type="range" aria-label="Learning wallet purchasing credits" min={Math.ceil(wallet.minFaceCents/100)} max={Math.floor(wallet.maxFaceCents/100)} value={creditCents/100} onChange={e=>setCreditCents(Number(e.target.value)*100)}/>
  </label>:terms.minSeats<terms.maxSeats?<label className="pricing-quantity">Learners <strong>{count.toLocaleString()}</strong>
   <input type="range" aria-label={`${title} learners`} min={terms.minSeats} max={terms.maxSeats} value={count} step={1} onChange={e=>setCount(Number(e.target.value))}/>
  </label>:null}
  <div aria-live="polite">{quote?<><p className="pricing-price">{moneyLabel(Math.ceil(quote.result.totalCents/count),currency)} <small>per learner for {terms.months} months</small></p>
   <p><strong>{moneyLabel(monthlyLearnerCents(quote.result.totalCents,count,terms.months),currency)} per learner per month</strong></p>
   <p>Platform cost for {count.toLocaleString()} {count===1?'learner':'learners'} <strong>{moneyLabel(quote.result.platformCents,currency)}</strong></p></>:<p role="status">Choose a credit value that covers the selected learner places.</p>}</div>
  <details><summary>What do you get for this price?</summary>
   <p>{count.toLocaleString()} named {count===1?'learner place':'learner places'} for {terms.months} months. {wallet?`${(creditCents/100).toLocaleString()} prepaid credits for the eligible courses above.`:route==='subscription'?'Platform access and the selected course licences.':'Access to the named training, its assessments and completion certificate when earned.'}</p>
  </details>
 </article>;
}
