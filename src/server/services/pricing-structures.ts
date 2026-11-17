import 'server-only';
import {checkedRentalAddition} from './rental-additions';
import type {RentalAdditionBasis} from '@/lib/rental-additions';
import {createHash} from 'node:crypto';
import {requireSession} from '@/server/auth/session';
import {validId} from '@/lib/company-structure';
import {quoteStructure,type PricingStructure} from '@/lib/pricing-structures';
import type {CostSchedule} from '@/lib/course-calculator';
import {isPlatformPrincipal} from './platform-principals';
import {rows,write} from './company-structure';
import {calculatorRpc,type CalculatorQuote,type CalculatorOrder} from './course-calculator';
import {stripeRequest} from './stripe-platform';
import {reconcileStripeFee,type StripeFeeTransaction} from '@/lib/stripe-fee-reconciliation';

export type PriceRecord={id:string;company_id:string;policy_id:string;document:PricingStructure;fingerprint:string;created_at:string;created_by:string};
export type PurchaseBatch={id:string;cart_id:string;buyer_id:string;company_id:string;mode:'test';state:string;payment_method:'card'|'invoice';amount_cents:number;currency:string;checkout_id:string|null;payment_intent:string|null;fee_evidence:unknown;hold_reason:string|null;created_at:string};
export function pricingFingerprint(value:unknown):string{return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export function shareableCost(id:string,s:CostSchedule):CostSchedule{return {id,currency:s.currency,monthlyPoolCents:s.monthlyPoolCents,activeLearners:s.activeLearners,newEnrolments:s.newEnrolments,variableCents:s.variableCents,processorBps:s.processorBps,processorFixedCents:s.processorFixedCents,source:s.source,sourceDraftId:s.sourceDraftId,rates:s.rates,floors:s.floors,margins:s.margins};}
export async function publishedStructure(companyId:string,courseId?:string){
 const release=(await rows<{structure_id:string}>(`/rest/v1/cc_structure_releases?company_id=eq.${validId(companyId)}&${courseId?`course_id=eq.${encodeURIComponent(courseId)}&`:''}select=structure_id&order=id.desc&limit=1`))[0];
 if(!release)return null;
 return (await rows<PriceRecord>(`/rest/v1/cc_price_structures?id=eq.${release.structure_id}&select=*&limit=1`))[0]??null;
}
export async function shopAccess(companyId:string){
 const session=await requireSession(),principal=await isPlatformPrincipal(session),id=validId(companyId);
 const company=(await rows<{id:string;name:string;slug:string}>(`/rest/v1/organisations?id=eq.${id}&is_active=eq.true&select=id,name,slug&limit=1`))[0];
 if(!company)throw Error('Company unavailable.');
 const manager=await calculatorRpc<boolean>('cc_can_manage',{p_actor:session.user.id,p_company:id});
 const member=principal||manager||(await rows<{user_id:string}>(`/rest/v1/organisation_memberships?organisation_id=eq.${id}&user_id=eq.${session.user.id}&is_active=eq.true&select=user_id&limit=1`)).length>0;
 if(!member&&company.slug!=='apgi')throw Error('Company membership required.');
 return {session,principal,manager,member,company};
}
export async function verifyStructureQuote(q:CalculatorQuote&{structure_id?:string;buyer_id?:string;expires_at?:string}){
 if(!q.structure_id)throw Error('Choose a current approved pricing structure.');
 const s=await publishedStructure(q.company_id,q.courses[0]?.courseId);
 if(!s||s.id!==q.structure_id)throw Error('The pricing structure changed. Request a fresh quote.');
 const addition=(q.input as unknown as {rentalAddition?:RentalAdditionBasis}).rentalAddition;
 const calculated=addition?await checkedRentalAddition(s.document,addition,q.buyer_id!):quoteStructure(s.document,q.input.route,q.input.seats);
 if(pricingFingerprint({structure:s.id,buyer:q.buyer_id,...calculated})!==q.fingerprint)throw Error('The saved quote requires reconciliation.');
}
export async function reconcilePricingBatch(batch:PurchaseBatch){
 if(batch.mode!=='test'||batch.state!=='funded'||!batch.payment_intent)return;
 try{
  const pi=await stripeRequest<{id:string;livemode:boolean;status:string;amount:number;currency:string;latest_charge:{id:string;paid:boolean;captured:boolean;refunded:boolean;amount_refunded:number;disputed:boolean;balance_transaction:StripeFeeTransaction|null}}>(`payment_intents/${batch.payment_intent}?expand%5B%5D=latest_charge.balance_transaction`);
  if(pi.id!==batch.payment_intent||pi.livemode!==false||pi.status!=='succeeded'||pi.amount!==batch.amount_cents||pi.currency!==batch.currency.toLowerCase()||!pi.latest_charge?.paid||!pi.latest_charge.captured)throw Error('Cart payment requires amount reconciliation.');
  if(pi.latest_charge.refunded||pi.latest_charge.amount_refunded||pi.latest_charge.disputed){await calculatorRpc('cc_hold_payment',{p_intent:pi.id,p_event:`reconcile_${pi.id}`,p_refund:pi.latest_charge.refunded===true});return;}
  const fee=reconcileStripeFee({amount:batch.amount_cents,currency:batch.currency.toLowerCase(),payment_intent:pi.id},pi.latest_charge.id,pi.latest_charge.balance_transaction);
  // The actual processor fee belongs to this one payment, never to each cart line.
  await write(`/rest/v1/cc_purchase_batches?id=eq.${batch.id}&state=eq.funded`,{fee_evidence:fee,hold_reason:null},'PATCH');
  await write(`/rest/v1/cc_orders?batch_id=eq.${batch.id}&state=eq.funded`,{fee_evidence:{reconciledAtBatch:batch.id},hold_reason:null},'PATCH');
 }catch{await write(`/rest/v1/cc_purchase_batches?id=eq.${batch.id}&state=eq.funded`,{hold_reason:'Actual processor fees or currency conversion await reconciliation. No partner payout is authorised.'},'PATCH');}
}
export async function confirmPricingBatch(object:Record<string,unknown>,eventId:string){
 const id=validId((object.metadata as Record<string,string>)?.apgi_pricing_batch);
 const b=(await rows<PurchaseBatch>(`/rest/v1/cc_purchase_batches?id=eq.${id}&select=*&limit=1`))[0];
 if(!b||b.mode!=='test'||object.livemode!==false||b.checkout_id!==object.id||b.amount_cents!==object.amount_total||b.currency.toLowerCase()!==object.currency||object.payment_status!=='paid'||typeof object.payment_intent!=='string'||!/^pi_[A-Za-z0-9]+$/.test(object.payment_intent))throw Error('Sandbox cart confirmation mismatch.');
 const pi=await stripeRequest<{id:string;livemode:boolean;status:string;amount:number;currency:string;metadata:{apgi_pricing_batch?:string};latest_charge:{paid:boolean;captured:boolean;refunded:boolean;amount_refunded:number;disputed:boolean}}>(`payment_intents/${object.payment_intent}?expand%5B%5D=latest_charge`);
 if(pi.id!==object.payment_intent||pi.livemode!==false||pi.status!=='succeeded'||pi.amount!==b.amount_cents||pi.currency!==b.currency.toLowerCase()||pi.metadata.apgi_pricing_batch!==id||!pi.latest_charge?.paid||!pi.latest_charge.captured)throw Error('Verified sandbox payment does not match the cart.');
 // A delayed paid receipt honours the accepted, frozen quote even after its offer expires.
 const held=pi.latest_charge.refunded||pi.latest_charge.amount_refunded>0||pi.latest_charge.disputed;
 await calculatorRpc('cc_confirm_batch',{p_batch:id,p_checkout:object.id,p_intent:pi.id,p_event:eventId,p_amount:pi.amount,p_currency:pi.currency,p_live:false,p_hold:held,p_refund:pi.latest_charge.refunded===true});
 if(!held)await reconcilePricingBatch({...b,state:'funded',payment_intent:pi.id});
}
export async function cartQuotes(cart:string,buyer:string){
 const owned=(await rows<{id:string}>(`/rest/v1/cc_carts?id=eq.${validId(cart)}&buyer_id=eq.${validId(buyer)}&select=id`))[0];if(!owned)throw Error('Your cart is unavailable.');
 const items=await rows<{quote_id:string}>(`/rest/v1/cc_cart_items?cart_id=eq.${cart}&select=quote_id&limit=20`);
 return items.length?rows<CalculatorQuote&{structure_id:string;buyer_id:string;expires_at:string}>(`/rest/v1/cc_quotes?id=in.(${items.map(i=>i.quote_id).join(',')})&buyer_id=eq.${buyer}&select=*&order=created_at.asc`):[];
}
