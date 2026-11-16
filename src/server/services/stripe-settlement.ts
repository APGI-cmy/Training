import "server-only";
import {createHash} from "node:crypto";
import {adminRest} from "@/server/supabase/admin-rest";
import {rows,write} from "./company-structure";
import {stripeRequest} from "./stripe-platform";
import {bothCommercialApprovals,currentCommercial,quoteCommercial,type PublicationWorkflow} from "@/lib/publication-workflow";
import {moneyCents} from "@/lib/commercial-planning";
import {stripeRoute} from "@/lib/stripe-payments";
import {confirmPurchaseCheckout} from './course-purchases';
import {reconcileStripeFee,StripeFeePending,type StripeFeeTransaction,type StripeFeeEvidence} from '@/lib/stripe-fee-reconciliation';
import {stripeEventDigest} from '@/lib/stripe-event-digest';

export type StripeOrder={id:string;buyer_id:string;release_id:string;company_id:string;course_id:string;amount:number;currency:string;state:string;checkout_id:string|null;payment_intent:string|null;charge_id:string|null;snapshot:Record<string,unknown>;allocation:Record<string,number>|null;hold_reason:string|null;fee_evidence?:StripeFeeEvidence|null};
export async function publishedPaymentSchedule(release:string,company:string){
 const round=(await rows<{id:string;course_id:string;organisation_id:string;fingerprint:string;document:{workflow:PublicationWorkflow}}>(`/rest/v1/course_review_rounds?id=eq.${release}&status=eq.published&select=id,course_id,organisation_id,fingerprint,document&limit=1`))[0];
 const offering=(await rows<{id:string}>(`/rest/v1/organisation_offerings?organisation_id=eq.${company}&reviewed_release_id=eq.${release}&status=eq.published&select=id&limit=1`))[0];
 const w=round?.document.workflow,v=w&&currentCommercial(w);
 if(!round||!offering||!w||w.stage!=="published"||!v||!bothCommercialApprovals(v)||w.contentApproval?.fingerprint!==round.fingerprint)throw Error("Only a published course with approved content and commercials can accept a test payment.");
 // Verify both decisions against the database's verified principal identities too.
 const principals=await rows<{email:string;user_id:string}>("/rest/v1/platform_principals?select=email,user_id");
 if(!principals.every(p=>p.user_id&&v.decisions.some(d=>d.email===p.email&&d.userId===p.user_id&&d.decision==="approve"))||principals.length!==2)throw Error("Both verified APGI approvals are required.");
 if(w.partner&&(!v.acceptance||v.acceptance.contentFingerprint!==round.fingerprint||w.partnerCompanyId!==company))throw Error("The exact partner commercial acceptance is required.");
 if(!w.partner&&round.organisation_id!==company)throw Error("The published company does not match.");
 const amount=w.partner?v.acceptance!.price:v.proposedPrice,{input}=quoteCommercial(v.configuration,amount),currency=(v.configuration.currency??"").toLowerCase();
 if(!["cad","usd","zar"].includes(currency))throw Error("The approved payment currency is unsupported.");
 // The legal course owner and the development funder can be different entities.
 // Never guess that recovery is payable to the legal owner or to a principal personally.
 const funder=v.configuration.development_funder,slug=funder==="APGI platform"?"apgi":funder==="SRMS"?"srms":null;
 const recipient=slug?(await rows<{id:string}>(`/rest/v1/organisations?slug=eq.${slug}&is_active=eq.true&select=id&limit=1`))[0]?.id:null;
 return {round,amount,currency,snapshot:{...input,commercialId:v.id,fingerprint:round.fingerprint,ownerId:w.ownerId,partnerId:company,recoveryRecipientId:recipient??null,developmentFunder:funder??null,development:moneyCents(v.configuration.development_cost??"","development cost"),initialPaid:moneyCents(v.configuration.already_paid??"","development paid")}};
}

export async function transferAllocations(order:StripeOrder){
 const current=(await rows<StripeOrder>(`/rest/v1/v2_stripe_orders?id=eq.${order.id}&select=*&limit=1`))[0];
 if(current?.state!=="allocated")return;
 const allocations=await rows<{company_id:string;amount:number;account_id:string|null;transfer_id:string|null;state:string}>(`/rest/v1/v2_stripe_allocations?order_id=eq.${order.id}&select=*`);
 // Retained platform income is an allocation, not a transfer to a bank or
 // connected account. Never label it transferred when no transfer is due.
 if(allocations.length===0)return;
 for(const a of allocations){
  if(a.transfer_id)continue;
  const route=(await rows<{account_id:string|null;country:string;state:string}>(`/rest/v1/v2_stripe_partner_accounts?company_id=eq.${a.company_id}&select=account_id,country,state&limit=1`))[0];
  if(!route?.account_id||route.state!=="ready"||stripeRoute(route.country)!=="stripe")throw Error("Partner onboarding or an approved alternative payment provider is required.");
  const account=a.account_id??route.account_id;
  if(account!==route.account_id)throw Error("The payout account changed; reconciliation is required.");
  const verified=await stripeRequest<{country:string;payouts_enabled:boolean;capabilities?:{transfers?:string}}>(`accounts/${account}`);
  if(verified.country!==route.country||!verified.payouts_enabled||verified.capabilities?.transfers!=="active")throw Error("Stripe has not enabled this partner's payouts.");
  await write(`/rest/v1/v2_stripe_allocations?order_id=eq.${order.id}&company_id=eq.${a.company_id}&account_id=is.null`,{account_id:account},"PATCH");
  const persisted=(await rows<{account_id:string}>(`/rest/v1/v2_stripe_allocations?order_id=eq.${order.id}&company_id=eq.${a.company_id}&select=account_id`))[0];
  if(persisted.account_id!==account)throw Error("Payout account reconciliation required.");
  type Transfer={id:string;amount:number;currency:string;destination:string;livemode:boolean;source_transaction:string;metadata:{apgi_order?:string}};
  // Stripe may prune an idempotency key after 24 hours. Look up the durable
  // transfer group first so a timeout followed by a later retry cannot pay twice.
  const previous=await stripeRequest<{data:Transfer[];has_more:boolean}>(`transfers?transfer_group=apgi_${order.id}&destination=${account}&limit=100`);
  if(previous.has_more||previous.data.length>1)throw Error("Multiple transfers require reconciliation.");
  const transfer=previous.data[0]??await stripeRequest<Transfer>("transfers","POST",{amount:String(a.amount),currency:order.currency,destination:account,source_transaction:order.charge_id!,transfer_group:`apgi_${order.id}`,"metadata[apgi_order]":order.id},`apgi-v2-transfer-${order.id}-${a.company_id}`);
  if(transfer.source_transaction!==order.charge_id||transfer.metadata.apgi_order!==order.id)throw Error("Transfer source reconciliation required.");
  if(transfer.livemode!==false||transfer.amount!==a.amount||transfer.currency!==order.currency||transfer.destination!==account)throw Error("Stripe transfer reconciliation required.");
  await write(`/rest/v1/v2_stripe_allocations?order_id=eq.${order.id}&company_id=eq.${a.company_id}`,{transfer_id:transfer.id,state:"transferred"},"PATCH");
 }
 await write(`/rest/v1/v2_stripe_orders?id=eq.${order.id}&state=eq.allocated`,{state:"transferred",hold_reason:null},"PATCH");
}

export async function settleStripeOrder(orderId:string,{attemptTransfers=true}:{attemptTransfers?:boolean}={}){
 const order=(await rows<StripeOrder>(`/rest/v1/v2_stripe_orders?id=eq.${orderId}&select=*&limit=1`))[0];
 if(!order?.payment_intent||order.state==="reconciliation"||order.state==="transferred")return;
 await write(`/rest/v1/v2_stripe_orders?id=eq.${order.id}`,{checked_at:new Date().toISOString()},"PATCH");
 const pi=await stripeRequest<{id:string;livemode:boolean;status:string;amount:number;currency:string;latest_charge:{id:string;paid:boolean;captured:boolean;refunded:boolean;amount_refunded:number;disputed:boolean;balance_transaction:StripeFeeTransaction|null}}>(`payment_intents/${order.payment_intent}?expand%5B%5D=latest_charge.balance_transaction`);
 if(pi.livemode||pi.status!=="succeeded"||pi.id!==order.payment_intent||pi.amount!==order.amount||pi.currency!==order.currency||!pi.latest_charge?.paid||!pi.latest_charge.captured)throw Error("Confirmed payment does not match the order.");
 const charge=pi.latest_charge;
 if(charge.refunded||charge.amount_refunded>0||charge.disputed){await write(`/rest/v1/v2_stripe_orders?id=eq.${order.id}`,{state:"reconciliation",hold_reason:"Refund or dispute: reconcile and reverse affected transfers before releasing funds."},"PATCH");return;}
 let evidence:StripeFeeEvidence;
 try{evidence=reconcileStripeFee({amount:order.amount,currency:order.currency,payment_intent:pi.id},charge.id,charge.balance_transaction);}
 catch(error){if(!(error instanceof StripeFeePending))throw error;await write(`/rest/v1/v2_stripe_orders?id=eq.${order.id}&state=in.(paid,held)`,{state:'held',hold_reason:error.message},'PATCH');return;}
 if(order.charge_id&&order.charge_id!==charge.id)throw Error("Order charge changed.");
 const result=await adminRest("/rest/v1/rpc/v3_stripe_reconcile_fee",{method:"POST",body:JSON.stringify({p_order:order.id,p_evidence:evidence})});
 if(!result.ok)throw Error("The approved cost sharing or recovery cap requires reconciliation.");
 if(attemptTransfers)await transferAllocations({...order,charge_id:charge.id});
}

export async function processStripeEvent(event:{id:string;type:string;livemode:boolean;data:{object:Record<string,unknown>}},body:string){
 if(event.livemode!==false||!/^evt_[a-zA-Z0-9]+$/.test(event.id))throw Error("Live or invalid Stripe events are blocked.");
 const hash=createHash("sha256").update(body).digest("hex");
 const semantic=stripeEventDigest(event);
 const receipt=await adminRest("/rest/v1/v2_stripe_webhook_events?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates"},body:JSON.stringify({id:event.id,event_type:event.type,body_hash:hash,semantic_hash:semantic})});
 if(!receipt.ok)throw Error('Webhook receipt could not be saved.');
 const saved=(await rows<{body_hash:string;semantic_hash:string|null;event_type:string;state:string}>(`/rest/v1/v2_stripe_webhook_events?id=eq.${event.id}&select=body_hash,semantic_hash,event_type,state`))[0];
 if(!saved||saved.event_type!==event.type||(saved.semantic_hash&&saved.semantic_hash!==semantic))throw Error("Webhook replay mismatch.");
 await write(`/rest/v1/v2_stripe_webhook_events?id=eq.${event.id}`,{last_body_hash:hash,last_attempt_at:new Date().toISOString(),last_error:null},'PATCH');
 // Legacy pending receipts have only a raw-byte hash. Revalidate their signed
 // financial fields against the saved order below before recording the digest.
 if(saved.state==="done")return;
 const obj=event.data.object;
 if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
  if((obj.metadata as Record<string,string>|undefined)?.apgi_purchase_order){
   await confirmPurchaseCheckout(obj,event.id);
   await write(`/rest/v1/v2_stripe_webhook_events?id=eq.${event.id}`,{state:'done',semantic_hash:semantic,completed_at:new Date().toISOString()},'PATCH');return;
  }
  const metadata=obj.metadata as Record<string,string>|undefined,id=metadata?.apgi_order;
  if(!id||!/^[a-f0-9-]{36}$/.test(id))throw Error("Missing order reference.");
  const o=(await rows<StripeOrder>(`/rest/v1/v2_stripe_orders?id=eq.${id}&select=*&limit=1`))[0];
  if(!o||o.checkout_id!==obj.id||o.amount!==obj.amount_total||o.currency!==obj.currency||obj.payment_status!=="paid"||typeof obj.payment_intent!=="string"||!/^pi_[a-zA-Z0-9]+$/.test(obj.payment_intent))throw Error("Checkout confirmation mismatch.");
  if(o.payment_intent&&o.payment_intent!==obj.payment_intent)throw Error("Payment intent changed.");
  await write(`/rest/v1/v2_stripe_orders?id=eq.${id}&state=in.(created,checkout)`,{state:"paid",payment_intent:obj.payment_intent},"PATCH");
  // Receipt is independent of settlement/payout readiness. The paid order and
  // hold are durable, and the scheduled settlement job retries them. Do not ask
  // Stripe to redeliver a correctly received payment just because fees are late.
  try{await settleStripeOrder(id,{attemptTransfers:false});}catch(error){await write(`/rest/v1/v2_stripe_orders?id=eq.${id}&state=in.(paid,held,allocated)`,{hold_reason:error instanceof Error?error.message:"Settlement requires attention."},"PATCH");}
 }else if(event.type==='charge.updated'&&typeof obj.payment_intent==='string'&&/^pi_[A-Za-z0-9]+$/.test(obj.payment_intent)){
  const eligible=await rows<StripeOrder>(`/rest/v1/v2_stripe_orders?payment_intent=eq.${obj.payment_intent}&state=in.(paid,held,allocated)&select=*`);
  for(const order of eligible){try{await settleStripeOrder(order.id,{attemptTransfers:false});}catch(error){await write(`/rest/v1/v2_stripe_orders?id=eq.${order.id}`,{hold_reason:error instanceof Error?error.message:'Settlement requires attention.'},'PATCH');}}
 }else if(event.type==='checkout.session.expired'&&(obj.metadata as Record<string,string>|undefined)?.apgi_purchase_order){
  const id=(obj.metadata as Record<string,string>).apgi_purchase_order;
  if(!/^[a-f0-9-]{36}$/.test(id)||typeof obj.id!=='string'||!/^cs_[A-Za-z0-9_]+$/.test(obj.id))throw Error('Invalid expired purchase checkout');
  await write(`/rest/v1/course_purchase_orders?id=eq.${id}&checkout_id=eq.${obj.id}&state=in.(pending,checkout)&payment_intent=is.null`,{state:'expired'},'PATCH');
 }else if(event.type==="account.updated"&&typeof obj.id==="string"&&/^acct_[a-zA-Z0-9]+$/.test(obj.id)){
  const capabilities=obj.capabilities as {transfers?:string}|undefined;
  await write(`/rest/v1/v2_stripe_partner_accounts?account_id=eq.${obj.id}&country=eq.${encodeURIComponent(String(obj.country))}`,{state:obj.payouts_enabled&&capabilities?.transfers==="active"?"ready":"restricted",updated_at:new Date().toISOString()},"PATCH");
  await write(`/rest/v1/v2_stripe_personal_accounts?account_id=eq.${obj.id}&country=eq.${encodeURIComponent(String(obj.country))}`,{state:obj.payouts_enabled&&capabilities?.transfers==="active"?"ready":"restricted",updated_at:new Date().toISOString()},"PATCH");
 }else if(["charge.refunded","charge.dispute.created","charge.dispute.updated"].includes(event.type)){
  const intent=obj.payment_intent;
  if(typeof intent==="string"&&/^pi_[a-zA-Z0-9]+$/.test(intent)){
   const reversed=await adminRest('/rest/v1/rpc/v3_refund_course_purchase',{method:'POST',body:JSON.stringify({p_intent:intent})});if(!reversed.ok)throw Error('Purchase refund reconciliation requires retry.');
   const orders=await write(`/rest/v1/v2_stripe_orders?payment_intent=eq.${intent}`,{state:"reconciliation",hold_reason:"Refund or dispute: funds and development recovery require reconciliation; automatic transfers stopped."},"PATCH") as StripeOrder[];
   for(const o of orders)await write(`/rest/v1/v2_stripe_allocations?order_id=eq.${o.id}`,{state:"reconciliation"},"PATCH");
  }
 }
 await write(`/rest/v1/v2_stripe_webhook_events?id=eq.${event.id}`,{state:"done",semantic_hash:semantic,completed_at:new Date().toISOString()},"PATCH");
}

export async function recordStripeEventFailure(event:unknown,error:unknown){
 if(!event||typeof event!=='object')return;
 const e=event as {id?:unknown;livemode?:unknown};
 if(e.livemode!==false||typeof e.id!=='string'||!/^evt_[A-Za-z0-9]+$/.test(e.id))return;
 const known=new Set(['Webhook replay mismatch.','Webhook receipt could not be saved.','Missing order reference.','Checkout confirmation mismatch.','Payment intent changed.','Records are temporarily unavailable. Please try again.','The change could not be saved. Check the details and try again.']);
 const reason=error instanceof Error&&known.has(error.message)?error.message:'Webhook processing failed; inspect the sandbox delivery.';
 console.error('Stripe sandbox receipt failure',{eventId:e.id,reason});
 await write(`/rest/v1/v2_stripe_webhook_events?id=eq.${e.id}&state=eq.pending`,{last_error:reason,last_attempt_at:new Date().toISOString()},'PATCH');
}
