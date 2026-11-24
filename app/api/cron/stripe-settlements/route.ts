import {timingSafeEqual} from "node:crypto";
import {stagingCronSecret} from '@/server/environment-isolation';
import {setupStatus} from "@/server/services/stripe-platform";
import {rows,write} from "@/server/services/company-structure";
import {settleStripeOrder} from "@/server/services/stripe-settlement";
import {reconcileCalculatorOrder,type CalculatorOrder} from '@/server/services/course-calculator';
import {reconcilePricingBatch,type PurchaseBatch} from '@/server/services/pricing-structures';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=stagingCronSecret(),actual=Buffer.from(request.headers.get("authorization")??""),expected=Buffer.from(`Bearer ${secret??""}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:"Unauthorized"},{status:401});
 try{
  if(!(await setupStatus()).configured)return Response.json({checked:0,waitingForOwner:true});
  const orders=await rows<{id:string}>("/rest/v1/v2_stripe_orders?state=in.(paid,held,allocated)&payment_intent=not.is.null&select=id&order=checked_at.asc.nullsfirst,created_at.asc&limit=5");let held=0;
  await Promise.all(orders.map(async order=>{try{await settleStripeOrder(order.id);}catch(error){held++;await write(`/rest/v1/v2_stripe_orders?id=eq.${order.id}&state=in.(paid,held,allocated)`,{hold_reason:error instanceof Error?error.message:"Reconciliation required."},"PATCH");}}));
  const calculatorOrders=await rows<CalculatorOrder>('/rest/v1/cc_orders?batch_id=is.null&state=eq.funded&or=(fee_evidence.is.null,hold_reason.not.is.null)&select=*&order=created_at.asc&limit=5');
  for(const order of calculatorOrders)await reconcileCalculatorOrder(order);
  const batches=await rows<PurchaseBatch>('/rest/v1/cc_purchase_batches?state=eq.funded&or=(fee_evidence.is.null,hold_reason.not.is.null)&select=*&order=created_at.asc&limit=5');
  for(const batch of batches)await reconcilePricingBatch(batch);
  return Response.json({pricingBatchesChecked:batches.length,checked:orders.length,held,calculatorChecked:calculatorOrders.length},{headers:{"cache-control":"no-store"}});
 }catch{return Response.json({error:"Sandbox settlement run incomplete; orders remain in the durable ledger."},{status:503});}
}
