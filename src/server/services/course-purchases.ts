import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {rows} from './company-structure';
import {stripeRequest} from './stripe-platform';
import {discountedCents} from '@/lib/course-editions';

export type PurchaseOffer={id:string;edition_id:string;kind:'ebook'|'refresher';title:string;amount_cents:number;minimum_cents:number;discount_bps:number;currency:string;access_days:number|null;ebook_paths:string[];enabled:boolean;valid_until:string;organisation_id:string|null};
export type PurchaseOrder={id:string;buyer_id:string;edition_id:string;kind:string;amount_cents:number;currency:string;checkout_id:string|null;mode:'test'|'live';state:string};
export function offerPrice(offer:Pick<PurchaseOffer,'amount_cents'|'discount_bps'|'minimum_cents'>){return discountedCents(offer.amount_cents,offer.discount_bps,offer.minimum_cents);}
export async function confirmPurchaseCheckout(object:Record<string,unknown>,eventId:string){
 const metadata=object.metadata as Record<string,string>|undefined,id=metadata?.apgi_purchase_order;
 if(!id||!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid purchase order');
 const order=(await rows<PurchaseOrder>(`/rest/v1/course_purchase_orders?id=eq.${id}&select=*&limit=1`))[0];
 if(!order||order.checkout_id!==object.id||order.amount_cents!==object.amount_total||order.currency.toLowerCase()!==object.currency||object.payment_status!=='paid'||typeof object.payment_intent!=='string'||!/^pi_[A-Za-z0-9]+$/.test(object.payment_intent))throw Error('Purchase confirmation mismatch');
 const pi=await stripeRequest<{id:string;livemode:boolean;amount:number;currency:string;status:string;metadata:{apgi_purchase_order?:string};latest_charge:{paid:boolean;captured:boolean;refunded:boolean;amount_refunded:number;disputed:boolean}}>(`payment_intents/${object.payment_intent}?expand%5B%5D=latest_charge`);
 if(pi.id!==object.payment_intent||pi.livemode!==false||order.mode!=='test'||pi.status!=='succeeded'||pi.amount!==order.amount_cents||pi.currency!==order.currency.toLowerCase()||pi.metadata.apgi_purchase_order!==order.id||!pi.latest_charge?.paid||!pi.latest_charge.captured||pi.latest_charge.refunded||pi.latest_charge.amount_refunded||pi.latest_charge.disputed)throw Error('Verified payment does not match the purchase');
 const result=await adminRest('/rest/v1/rpc/v3_fulfil_course_purchase',{method:'POST',body:JSON.stringify({p_order:id,p_event:eventId,p_checkout:object.id,p_intent:pi.id,p_amount:pi.amount,p_currency:pi.currency,p_live:false})});
 if(!result.ok)throw Error('Purchase fulfilment requires reconciliation');
}
