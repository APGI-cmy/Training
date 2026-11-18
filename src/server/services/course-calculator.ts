import type {CreditCourse} from '@/lib/credit-course-metadata';
import 'server-only';
import {createHash} from 'node:crypto';
import {requireSession} from '@/server/auth/session';
import {validId} from '@/lib/company-structure';
import {calculateCoursePrice,type CostSchedule,type CalculatorInput} from '@/lib/course-calculator';
import {accessibleCompanies,ownMemberships,requireCompany,rows,write} from './company-structure';
import {isPlatformPrincipal} from './platform-principals';
import {adminRest} from '@/server/supabase/admin-rest';
import {stripeRequest} from './stripe-platform';
import {reconcileStripeFee,type StripeFeeTransaction} from '@/lib/stripe-fee-reconciliation';
import pricingPolicy from '@/data/course-pricing-policy.json';
import {productionCompanyId} from './tenant-courses';

export type CalculatorQuote={id:string;company_id:string;created_by:string;input:CalculatorInput;result:ReturnType<typeof calculateCoursePrice>;courses:CreditCourse[];cost_snapshot:CostSchedule;fingerprint:string;policy_id:string;created_at:string};
export type CalculatorOrder={id:string;quote_id:string;buyer_id:string;company_id:string;mode:'test';state:string;checkout_id:string|null;payment_intent:string|null;amount_cents:number;currency:string;fee_evidence:Record<string,unknown>|null;hold_reason:string|null};
export type CalculatorSeat={id:string;order_id:string;position:number;learner_id:string|null;credit_units:number;course_limit:number;content_cents:number;expires_at:string;state:string};
export async function calculatorAccess(companyId?:string){
 const session=await requireSession(),principal=await isPlatformPrincipal(session),members=await ownMemberships(session,true);
 const available=(await accessibleCompanies(session,true)).filter(c=>principal||members.some(m=>m.organisation_id===c.id));
 const company=available.find(c=>c.id===companyId)??(!companyId?(available.find(c=>c.slug==='apgi')??available[0]):undefined);
 if(!company)throw Error('The course calculator is available to APGI principals and assigned company owners.');
 await requireCompany(company.id,true);
 return {session,principal,company,companies:available};
}
export async function calculatorCourses(companyId:string,principal:boolean){
 const [versions,editions,companies,offerings]=await Promise.all([
  rows<{id:string;edition_id:string;owner_id:string;snapshot:Omit<CreditCourse,'id'|'editionId'|'ownerId'|'ownerIsApgi'>}>('/rest/v1/cc_credit_versions?select=*&order=created_at.desc&limit=1000'),
  rows<{id:string;course_id:string;edition_number:number;course_document:{title:string;classification?:{category?:CreditCourse['scope'];industry?:string;clientName?:string}}}>(`/rest/v1/course_editions?state=eq.ready&select=id,course_id,edition_number,course_document&limit=1000`),
  rows<{id:string;slug:string;name:string}>('/rest/v1/organisations?is_active=eq.true&select=id,slug,name'),
  rows<{course_id:string}>(`/rest/v1/organisation_offerings?organisation_id=eq.${companyId}&select=course_id`)
 ]);
 const tenant=productionCompanyId();
 const seen=new Set<string>(),courses:CreditCourse[]=[];
 for(const v of versions){if(seen.has(v.edition_id))continue;seen.add(v.edition_id);const e=editions.find(e=>e.id===v.edition_id),owner=companies.find(c=>c.id===v.owner_id);if(!e||!owner)continue;
  if(tenant&&!offerings.some(o=>o.course_id===e.course_id))continue;
  if(!principal&&v.owner_id!==companyId&&v.snapshot.scope!=='public'&&!offerings.some(o=>o.course_id===e.course_id))continue;
  courses.push({...v.snapshot,id:v.id,editionId:e.id,courseId:e.course_id,title:`${e.course_document.title} · edition ${e.edition_number}`,ownerId:owner.id,ownerIsApgi:owner.slug==='apgi',industry:v.snapshot.industry??e.course_document.classification?.industry,clientName:v.snapshot.clientName??e.course_document.classification?.clientName});
 }
 return {courses,editions,companies};
}
export async function calculatorWalletCourses(companyId:string,principal:boolean){
 const [catalogue,published]=await Promise.all([calculatorCourses(companyId,principal),rows<{course_id:string}>(`/rest/v1/organisation_offerings?organisation_id=eq.${companyId}&status=eq.published&select=course_id`)]);
 return catalogue.courses.filter(c=>published.some(p=>p.course_id===c.courseId));
}
export async function calculatorPolicy(principal:boolean,actorId:string){
 const policy=(await rows<{id:string;version:string;body:string;body_hash:string}>(`/rest/v1/cc_policy_versions?version=eq.${encodeURIComponent(pricingPolicy.version)}&select=*&limit=1`))[0];
 if(policy)return policy;
 if(!principal)return null;
 return calculatorRpc<{id:string;version:string;body:string;body_hash:string}>('cc_prepare_policy',{p_actor:actorId,p_version:pricingPolicy.version,p_body:pricingPolicy.body,p_hash:createHash('sha256').update(pricingPolicy.body).digest('hex')});
}
export async function calculatorRpc<T>(name:string,body:Record<string,unknown>):Promise<T>{
 if(!/^cc_[a-z_]+$/.test(name))throw Error('Invalid calculator operation.');
 const response=await adminRest(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(body)});
 if(!response.ok){console.error('Calculator operation failed',{operation:name,status:response.status});throw Error('This action could not be completed. Check approvals, access, available balance and whether the action was already recorded.');}
 if(response.status===204)return undefined as T;
 return response.json();
}
export async function assertCalculatorCoursesPublished(quote:CalculatorQuote){
 const {publishedPaymentSchedule}=await import('./stripe-settlement');
 const {contentSource}=await import('./course-reviews');
 const canonical=(value:unknown):string=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,JSON.parse(canonical(v))])):value);
 for(const c of quote.courses){
  const offering=(await rows<{reviewed_release_id:string}>(`/rest/v1/organisation_offerings?organisation_id=eq.${quote.company_id}&course_id=eq.${encodeURIComponent(c.courseId)}&status=eq.published&select=reviewed_release_id&limit=1`))[0];
  if(!offering?.reviewed_release_id)throw Error('Each selected course must have a published, approved offering for this company.');
  const prior=await publishedPaymentSchedule(offering.reviewed_release_id,quote.company_id);
  if(prior.snapshot.ownerId!==c.ownerId)throw Error('The credit record owner differs from the published rights record. Verify ownership and prepare a corrected quote; a calculator entry cannot transfer course rights.');
  if(prior.snapshot.development>prior.snapshot.initialPaid)throw Error('This course has an existing development-recovery agreement. Its saved price and recovery stay in force; a separately approved replacement recovery schedule is required before using a new calculator checkout.');
  const source=await contentSource(c.courseId,quote.company_id);
  const edition=(await rows<{course_document:unknown}>(`/rest/v1/course_editions?id=eq.${validId(c.editionId)}&state=eq.ready&select=course_document&limit=1`))[0];
  if(source.fingerprint!==prior.round.fingerprint)throw Error('The current course has changes beyond its published review. Complete the exact content review before using a new calculator checkout.');
  if(!edition||canonical(edition.course_document)!==canonical(JSON.parse(JSON.stringify(source.course))))throw Error('The stored edition differs from the reviewed course. Freeze and verify the approved edition before preparing its new checkout; earlier learner editions remain unchanged.');
 }
}
export async function reconcileCalculatorOrder(order:CalculatorOrder){
 if((order as CalculatorOrder&{batch_id?:string}).batch_id||!order.payment_intent||order.mode!=='test'||order.state!=='funded')return;
 try{
  const pi=await stripeRequest<{id:string;livemode:boolean;status:string;amount:number;currency:string;latest_charge:{id:string;paid:boolean;captured:boolean;refunded:boolean;amount_refunded:number;disputed:boolean;balance_transaction:StripeFeeTransaction|null}}>(`payment_intents/${order.payment_intent}?expand%5B%5D=latest_charge.balance_transaction`);
  if(pi.id!==order.payment_intent||pi.livemode!==false||pi.status!=='succeeded'||pi.amount!==order.amount_cents||pi.currency!==order.currency.toLowerCase()||!pi.latest_charge?.paid||!pi.latest_charge.captured)throw Error('Payment requires amount reconciliation.');
  if(pi.latest_charge.refunded||pi.latest_charge.amount_refunded||pi.latest_charge.disputed){await calculatorRpc('cc_hold_payment',{p_intent:pi.id,p_event:`reconcile_${pi.id}`,p_refund:pi.latest_charge.refunded===true});throw Error('Payment requires refund or dispute reconciliation.');}
  const fee=reconcileStripeFee({amount:order.amount_cents,currency:order.currency.toLowerCase(),payment_intent:pi.id},pi.latest_charge.id,pi.latest_charge.balance_transaction);
  await write(`/rest/v1/cc_orders?id=eq.${order.id}&state=eq.funded`,{fee_evidence:fee,hold_reason:null},'PATCH');
 }catch(error){await write(`/rest/v1/cc_orders?id=eq.${order.id}&state=eq.funded`,{hold_reason:error instanceof Error?error.message:'Actual processor fee requires reconciliation.'},'PATCH');}
}
export async function confirmCalculatorCheckout(object:Record<string,unknown>,eventId:string){
 const id=(object.metadata as Record<string,string>)?.apgi_calculator_order;validId(id);
 const order=(await rows<CalculatorOrder>(`/rest/v1/cc_orders?id=eq.${id}&select=*&limit=1`))[0];
 if(!order||order.checkout_id!==object.id||order.amount_cents!==object.amount_total||order.currency.toLowerCase()!==object.currency||object.payment_status!=='paid'||typeof object.payment_intent!=='string'||!/^pi_[A-Za-z0-9]+$/.test(object.payment_intent))throw Error('Calculator payment confirmation mismatch.');
 const pi=await stripeRequest<{id:string;livemode:boolean;status:string;amount:number;currency:string;metadata:{apgi_calculator_order:string};latest_charge:{paid:boolean;captured:boolean;refunded:boolean;amount_refunded:number;disputed:boolean}}>(`payment_intents/${object.payment_intent}?expand%5B%5D=latest_charge`);
 if(pi.id!==object.payment_intent||pi.livemode!==false||pi.status!=='succeeded'||pi.metadata.apgi_calculator_order!==id||pi.amount!==order.amount_cents||pi.currency!==order.currency.toLowerCase()||!pi.latest_charge?.paid||!pi.latest_charge.captured||pi.latest_charge.refunded||pi.latest_charge.amount_refunded||pi.latest_charge.disputed)throw Error('Verified sandbox payment does not match the calculator order.');
 await calculatorRpc('cc_fund_order',{p_order:id,p_checkout:object.id,p_intent:pi.id,p_event:eventId,p_amount:pi.amount,p_currency:pi.currency,p_live:false});
 await reconcileCalculatorOrder({...order,state:'funded',payment_intent:pi.id});
}
