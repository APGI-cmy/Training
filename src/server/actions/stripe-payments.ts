"use server";
import {createHash,randomBytes} from "node:crypto";
import {revalidatePath} from "next/cache";
import {adminRest} from "@/server/supabase/admin-rest";
import {rows,write,requireCompany,ownMemberships} from "@/server/services/company-structure";
import {requirePlatformPrincipal,isPlatformPrincipal} from "@/server/services/platform-principals";
import {requireStripeOwner,stripeVault,stripeRequest,partnerOnboardingLink,paymentAudit} from "@/server/services/stripe-platform";
import {publishedPaymentSchedule,settleStripeOrder,type StripeOrder} from "@/server/services/stripe-settlement";
import {validateTestCredentials,sealStripe,openStripe,STRIPE_OWNER_EMAIL,stripeRoute,stripeRedirect} from "@/lib/stripe-payments";
import {deliverTransactionalEmail} from "@/server/services/email/transactional-delivery";
import {STAGING_ORIGIN} from "@/server/environment-isolation";
import {validId} from "@/lib/company-structure";
export type PaymentState={error?:string;success?:string;url?:string};
const errorState=(error:unknown):PaymentState=>({error:error instanceof Error?error.message:"The payment setup could not be updated."});
const text=(f:FormData,key:string)=>String(f.get(key)??"").trim();
export async function savePrivateStripe(_previous:PaymentState,form:FormData):Promise<PaymentState>{
 try{
  const {session}=await requireStripeOwner(); // Always before reading secrets or submitted credentials.
  const key=text(form,"key"),webhook=text(form,"webhook");validateTestCredentials(key,webhook);
  if(form.get("bank_confirmation")!=="on")throw Error("Confirm that APGI bank details are managed privately in Stripe.");
  const account=await stripeRequest<{id:string;country:string;livemode?:boolean}>("account","GET",{},undefined,key);
  if(account.country!=="CA"||!/^acct_[A-Za-z0-9]+$/.test(account.id)||account.livemode===true)throw Error("Connect the Canadian APGI Stripe sandbox account.");
  // Replacing the platform account would invalidate source charges and recovery records.
  const existing=(await rows<{sealed:string}>("/rest/v1/v2_stripe_private_setup?id=eq.platform&select=sealed"))[0];
  if(existing&&openStripe<{account:string}>(existing.sealed).account!==account.id)throw Error("Changing the APGI Stripe account requires a separate migration and reconciliation.");
  await stripeRequest("accounts?limit=1","GET",{},undefined,key);
  const response=await adminRest("/rest/v1/rpc/v2_stripe_save_private",{method:"POST",body:JSON.stringify({p_actor:session.user.id,p_sealed:sealStripe({key,webhook,account:account.id})})});
  if(!response.ok)throw Error("Private setup could not be saved.");revalidatePath("/admin/payments/stripe");
  return {success:"Sandbox connection verified and saved privately. Webhook delivery still needs to be tested. No live payments are enabled."};
 }catch(error){return errorState(error);}
}

export async function requestStripeSetup(_previous:PaymentState,_form:FormData):Promise<PaymentState>{
 try{
  const {session}=await requirePlatformPrincipal(),token=randomBytes(32).toString("base64url");
  const response=await adminRest("/rest/v1/rpc/v2_stripe_request",{method:"POST",body:JSON.stringify({p_actor:session.user.id,p_hash:createHash("sha256").update(token).digest("hex"),p_sealed_token:sealStripe({token})})});
  if(!response.ok)throw Error("The setup request could not be prepared.");
  const request=await response.json() as {id:string;mail_state:string;invitation_id:string|null;sealed_token:string|null};
  if(request.mail_state==="accepted")return {success:"Jorrie’s setup request has already been accepted by the email provider. His platform notification appears when he signs into his verified V2 administrator account."};
  const invitation=request.sealed_token?`${STAGING_ORIGIN}/invitations/${openStripe<{token:string}>(request.sealed_token).token}`:null;
  const privateUrl=`${STAGING_ORIGIN}/admin/payments/stripe/private`;
  const instructions=["Jorrie, Johan has requested APGI’s Stripe platform setup for partner cost sharing and cross-border payouts.",
   "This is the V2 sandbox preparation. It cannot collect real payments or move real money. A live release will be reviewed separately.",
   invitation?`First accept your APGI administrator invitation: ${invitation}`:"Use your verified V2 administrator account at jorrie.jordaan@apginc.ca. If you have not registered yet, use the APGI V2 administrator invitation already emailed to you. Your V1 login is separate.",
   `Open your private setup page: ${privateUrl}`,
   "In your existing Canadian APGI Stripe account, switch to a sandbox/test environment and enable Connect. Create a restricted sandbox key (rk_test_) with the permissions listed on the private setup page. Add the test webhook endpoint and copy its signing secret there.",
   "Enter or check APGI’s bank account directly in Stripe Dashboard. The platform never collects bank account numbers. Do not email bank details, passwords or API keys to anyone. Johan cannot open your private platform setup page or retrieve the saved keys.",
   "Stripe must approve each cross-border route and connected account. Unsupported destinations remain on hold until APGI arranges an approved alternative provider.",
   "Once you sign in, your sidebar Notifications will show this setup request. Opening it records a read receipt; completion is recorded only after the sandbox connection is verified. Hosting and database administrators remain a separate privileged access boundary."
  ];
  const escape=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const delivered=await deliverTransactionalEmail({to:STRIPE_OWNER_EMAIL,subject:"Action requested: your private APGI Stripe and bank setup",text:instructions.join("\n\n"),html:instructions.map(p=>`<p>${escape(p)}</p>`).join("")+`<p><a href="${privateUrl}">Open private APGI payment setup</a></p>`,idempotencyKey:`apgi-v2-stripe-setup-${request.id}`});
  await write(`/rest/v1/v2_stripe_setup_requests?id=eq.${request.id}`,{mail_state:delivered.ok?"accepted":"failed",provider_message_id:delivered.ok?delivered.providerMessageId:null},"PATCH");
  if(delivered.ok&&request.sealed_token&&request.invitation_id){
   await write(`/rest/v1/course_invitations?id=eq.${request.invitation_id}&status=eq.pending`,{status:"sent"},"PATCH");
   await write("/rest/v1/course_invitation_events",{invitation_id:request.invitation_id,event_type:"sent",actor_id:session.user.id,metadata:{provider_message_id:delivered.providerMessageId,environment:"v2-staging"}});
  }
  revalidatePath("/admin/payments/stripe");if(!delivered.ok)throw Error("The platform request is saved, but email failed. Retry the setup request.");
  return {success:"Setup request sent to jorrie.jordaan@apginc.ca and accepted by the email provider. His sidebar request is available after he signs into his verified V2 administrator account."};
 }catch(error){return errorState(error);}
}

export async function partnerStripeAction(_previous:PaymentState,form:FormData):Promise<PaymentState>{
 try{
  const companyId=validId(text(form,"company")),access=await requireCompany(companyId);
  if(access.company.slug==="apgi")throw Error("APGI banking is managed through Jorrie’s private setup.");
  if(!(await ownMemberships(access.session,true)).some(m=>m.organisation_id===companyId))throw Error("Only this company’s assigned owner may connect its bank and Stripe account.");
  if(text(form,"operation")!=="refresh"&&form.get("payment_purpose")!=="on")throw Error("Confirm that the account details will be used for payment purposes only.");
  const existing=(await rows<{account_id:string|null;country:string;state:string}>(`/rest/v1/v2_stripe_partner_accounts?company_id=eq.${companyId}&select=account_id,country,state`))[0];
  const country=existing?.account_id?existing.country:text(form,"country").toUpperCase();if(!/^[A-Z]{2}$/.test(country))throw Error("Enter your company’s two-letter country code.");
  if(stripeRoute(country)==="alternative_required"){
   await write("/rest/v1/v2_stripe_partner_accounts?on_conflict=company_id",{company_id:companyId,owner_id:access.session.user.id,country,account_id:null,state:"alternative_required",updated_at:new Date().toISOString()});
   await paymentAudit(access.session.user.id,`alternative_provider_required:${companyId}`);
   return {success:"This destination requires an approved alternative payment provider. Payouts remain on hold; APGI can see the request in the payment portal."};
  }
  let account=existing?.account_id;
  if(!account){
   await paymentAudit(access.session.user.id,`payment_purpose_accepted:v1:${companyId}`);
   const created=await stripeRequest<{id:string;country:string;livemode?:boolean}>("accounts","POST",{type:"express",country,email:access.session.user.email!,"capabilities[transfers][requested]":"true","metadata[apgi_company]":companyId},`apgi-v2-connect-${companyId}-${country}`);
   if(created.livemode===true||created.country!==country||!/^acct_[A-Za-z0-9]+$/.test(created.id))throw Error("Stripe account verification failed.");account=created.id;
   await write("/rest/v1/v2_stripe_partner_accounts?on_conflict=company_id",{company_id:companyId,owner_id:access.session.user.id,country,account_id:account,state:"onboarding",updated_at:new Date().toISOString()});
  }
  if(text(form,"operation")==="refresh"){
   const verified=await stripeRequest<{country:string;payouts_enabled:boolean;capabilities?:{transfers?:string}}>(`accounts/${account}`);
   const ready=verified.country===country&&verified.payouts_enabled&&verified.capabilities?.transfers==="active";
   await write(`/rest/v1/v2_stripe_partner_accounts?company_id=eq.${companyId}`,{state:ready?"ready":"restricted",updated_at:new Date().toISOString()},"PATCH");
   revalidatePath(`/company/${companyId}/payments`);return {success:ready?"Stripe confirms this account can receive payouts. Every actual transfer is still checked by Stripe.":"Stripe onboarding or payout approval is incomplete. Continue onboarding in Stripe."};
  }
  return {url:await partnerOnboardingLink(companyId,account),success:"Continue in Stripe to enter private company and bank information. Returning here alone does not approve payouts."};
 }catch(error){return errorState(error);}
}

export async function createStripeCheckout(_previous:PaymentState,form:FormData):Promise<PaymentState>{
 try{
  const company=validId(text(form,"company")),release=validId(text(form,"release")),access=await requireCompany(company,false);
  if(!await isPlatformPrincipal(access.session)&&!(await ownMemberships(access.session,true)).some(m=>m.organisation_id===company))throw Error("Only APGI principals or the company owner can prepare this sandbox checkout.");
  await stripeVault();const schedule=await publishedPaymentSchedule(release,company);
  // A single reusable pending checkout per buyer/release; concurrent submits are serialized by SQL.
  const prepared=await adminRest("/rest/v1/rpc/v2_stripe_prepare_order",{method:"POST",body:JSON.stringify({p_actor:access.session.user.id,p_release:release,p_company:company,p_amount:schedule.amount,p_currency:schedule.currency,p_course:schedule.round.course_id,p_snapshot:schedule.snapshot})});
  if(!prepared.ok)throw Error("The published course changed or a payment already requires attention.");const order=await prepared.json() as StripeOrder;
  let session:{id:string;url:string;livemode:boolean};
  if(order.checkout_id){session=await stripeRequest(`checkout/sessions/${order.checkout_id}`);}
  else session=await stripeRequest("checkout/sessions","POST",{mode:"payment","payment_method_types[0]":"card","line_items[0][price_data][currency]":schedule.currency,"line_items[0][price_data][unit_amount]":String(schedule.amount),"line_items[0][price_data][product_data][name]":`APGI sandbox: ${schedule.round.course_id}`,"line_items[0][quantity]":"1",client_reference_id:order.id,"metadata[apgi_order]":order.id,"payment_intent_data[metadata][apgi_order]":order.id,"payment_intent_data[transfer_group]":`apgi_${order.id}`,success_url:`${STAGING_ORIGIN}/company/${company}/payments?checkout=returned`,cancel_url:`${STAGING_ORIGIN}/company/${company}/payments?checkout=cancelled`},`apgi-v2-checkout-${order.id}`);
  if(session.livemode!==false)throw Error("Live checkout is blocked in V2.");const url=stripeRedirect(session.url,"checkout");
  await write(`/rest/v1/v2_stripe_orders?id=eq.${order.id}&state=in.(created,checkout)`,{checkout_id:session.id,state:"checkout"},"PATCH");
  return {success:"Sandbox checkout prepared. Use Stripe test cards only; this creates no learner enrolment or certificate.",url};
 }catch(error){return errorState(error);}
}
export async function retryStripeSettlement(_previous:PaymentState,form:FormData):Promise<PaymentState>{
 try{const {session}=await requirePlatformPrincipal(),id=validId(text(form,"order"));await settleStripeOrder(id);await paymentAudit(session.user.id,`sandbox_settlement_retried:${id}`);revalidatePath("/admin/payments/stripe");return {success:"The sandbox settlement was checked. See its current status below."};}catch(error){return errorState(error);}
}
