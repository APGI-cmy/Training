'use client';
import {useState} from 'react';
import {QuantitySlider} from './PricingWorkflow';
import {StructureForm} from '@/components/admin/StructureForm';
import {addPricingQuote} from '@/server/actions/pricing-structures';
import {moneyLabel,ROUTE_NAMES} from '@/lib/pricing-structures';
import type {PurchaseRoute} from '@/lib/course-calculator';
export type ShopOffer={route:PurchaseRoute;min:number;max:number;months:number;cap:number;credits:number;courses:string[];prices:[number,number,number,number,number,number][]};
export function CourseShop({company,course,currency,offers}:{company:string;course:string;currency:string;offers:ShopOffer[]}){
 return <div className="pricing-cards">{offers.map(o=><Offer key={`${course}-${o.route}`} company={company} course={course} currency={currency} offer={o}/>)}</div>;
}
function Offer({company,course,currency,offer:o}:{company:string;course:string;currency:string;offer:ShopOffer}){
 const [seats,setSeats]=useState(o.min),p=o.prices[seats-o.min];
 return <article className="directory-card"><h2>{ROUTE_NAMES[o.route]}</h2><p className="pricing-price">{moneyLabel(Math.ceil(p[1]/seats),currency)} <small>per learner for {o.months} months</small></p><p><strong>Total {moneyLabel(p[1],currency)}</strong> before tax</p>{o.min!==o.max?<QuantitySlider label={`${ROUTE_NAMES[o.route]} learners`} min={o.min} max={o.max} value={seats} onChange={setSeats}/>:<p>One learner · one named course</p>}<p>Content {moneyLabel(p[2],currency)} · platform recovery {moneyLabel(p[3],currency)} · processing provision {moneyLabel(p[4],currency)}.</p><p>Effective content discount {(p[5]/100).toFixed(2)}%. Price floors may limit discounts.</p><details><summary>What do you get for this price?</summary><ul><li>{seats} named learner places</li><li>{o.credits} internal learning credits per learner</li><li>Up to {o.cap} eligible course(s) per learner over {o.months} months</li><li>Learning activities, assessments and certificates subject to the course requirements</li><li>Records retained after access expiry</li><li>{o.route==='wallet'?'Prepaid learning allowance with no cash withdrawal':o.route==='subscription'?'Prepaid platform access, no automatic renewal':'Access to the named course'}</li></ul><p>Eligible editions: {o.courses.join('; ')}</p><p>Internal credits are workload units, not an accreditation award. Unused allowance expires under the accepted terms. Sandbox purchases do not grant live course access.</p></details><StructureForm action={addPricingQuote} label="Add exact test quote to cart"><input type="hidden" name="company" value={company}/><input type="hidden" name="course" value={course}/><input type="hidden" name="route" value={o.route}/><input type="hidden" name="seats" value={seats}/></StructureForm></article>;
}
