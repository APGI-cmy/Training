"use server";
import {revalidatePath} from "next/cache";
import {paymentPortalAccess} from "@/server/services/payment-reports";
import {rows,write} from "@/server/services/company-structure";
import {stripeRequest,paymentAudit} from "@/server/services/stripe-platform";
import {stripeRoute,stripeRedirect} from "@/lib/stripe-payments";
import {STAGING_ORIGIN} from "@/server/environment-isolation";
import type {PaymentState} from "./stripe-payments";
export async function personalStripeAction(_previous:PaymentState,form:FormData):Promise<PaymentState>{
 try{
  const {session}=await paymentPortalAccess(),id=session.user.id,refresh=form.get("operation")==="refresh";
  if(!refresh&&form.get("payment_purpose")!=="on")throw Error("Confirm that these account details will be used for payment purposes only.");
  const existing=(await rows<{account_id:string|null;country:string;state:string}>(`/rest/v1/v2_stripe_personal_accounts?user_id=eq.${id}&select=account_id,country,state`))[0];
  const country=existing?.account_id?existing.country:String(form.get("country")??"").trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(country))throw Error("Select a valid two-letter country code.");
  if(stripeRoute(country)==="alternative_required"){
   await write("/rest/v1/v2_stripe_personal_accounts?on_conflict=user_id",{user_id:id,country,account_id:null,state:"alternative_required",updated_at:new Date().toISOString()});
   await paymentAudit(id,"personal_alternative_provider_requested");return {success:"An alternative provider is required for your destination. APGI can see the routing request. Funds remain held."};
  }
  let account=existing?.account_id;
  if(!account){
   await paymentAudit(id,"personal_payment_purpose_accepted:v1");
   const result=await stripeRequest<{id:string;country:string;livemode?:boolean}>("accounts","POST",{type:"express",country,email:session.user.email!,"capabilities[transfers][requested]":"true","metadata[apgi_recipient]":id},`apgi-v2-personal-${id}-${country}`);
   if(result.livemode===true||result.country!==country||!/^acct_[A-Za-z0-9]+$/.test(result.id))throw Error("Stripe account verification failed.");account=result.id;
   await write("/rest/v1/v2_stripe_personal_accounts?on_conflict=user_id",{user_id:id,country,account_id:account,state:"onboarding",updated_at:new Date().toISOString()});
  }
  if(refresh){
   const result=await stripeRequest<{country:string;payouts_enabled:boolean;capabilities?:{transfers?:string}}>(`accounts/${account}`),ready=result.country===country&&result.payouts_enabled&&result.capabilities?.transfers==="active";
   await write(`/rest/v1/v2_stripe_personal_accounts?user_id=eq.${id}`,{state:ready?"ready":"restricted",updated_at:new Date().toISOString()},"PATCH");revalidatePath("/payments");
   return {success:ready?"Stripe confirms your receiving account is enabled. Payments still require an approved allocation.":"Stripe verification is incomplete. Continue your private onboarding."};
  }
  const link=await stripeRequest<{url:string}>("account_links","POST",{account,type:"account_onboarding",refresh_url:`${STAGING_ORIGIN}/payments?refresh=1`,return_url:`${STAGING_ORIGIN}/payments?returned=1`});
  return {url:stripeRedirect(link.url,"connect"),success:"Continue securely in Stripe. Your personal bank details are not stored or displayed on this platform."};
 }catch(error){return {error:error instanceof Error?error.message:"Your payment account could not be updated."};}
}
