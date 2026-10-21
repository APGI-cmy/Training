import "server-only";
import {requirePlatformPrincipal} from "./platform-principals";
import {adminRest} from "@/server/supabase/admin-rest";
import {rows,write} from "./company-structure";
import {openStripe,STRIPE_OWNER_EMAIL,stripeRedirect} from "@/lib/stripe-payments";
import {assertStagingIsolation,STAGING_ORIGIN} from "@/server/environment-isolation";
export type StripeVault={key:string;webhook:string;account:string};
export async function requireStripeOwner(){const actor=await requirePlatformPrincipal();if(actor.session.user.email?.toLowerCase()!==STRIPE_OWNER_EMAIL)throw Error("Only Jorrie may open or change APGI’s private Stripe setup.");return actor;}
export async function stripeVault(){assertStagingIsolation();const row=(await rows<{sealed:string}>("/rest/v1/v2_stripe_private_setup?id=eq.platform&select=sealed&limit=1"))[0];if(!row)throw Error("Jorrie must complete the private Stripe sandbox setup first.");return openStripe<StripeVault>(row.sealed);}
export async function stripeRequest<T>(path:string,method="GET",values:Record<string,string>={},idempotency?:string,key?:string):Promise<T>{
 assertStagingIsolation();if(!/^[a-z_]+(?:\/[a-zA-Z0-9_]+)*(?:\?[a-zA-Z0-9_.=&%\[\]-]+)?$/.test(path))throw Error("Invalid Stripe request.");
 const token=key??(await stripeVault()).key;if(!token.startsWith("rk_test_"))throw Error("Live payment requests are blocked in V2.");
 const response=await fetch(`https://api.stripe.com/v1/${path}`,{method,headers:{authorization:`Bearer ${token}`,"Stripe-Version":"2025-06-30.basil",...(method!=="GET"?{"content-type":"application/x-www-form-urlencoded"}:{}),...(idempotency?{"Idempotency-Key":idempotency}:{})},...(method!=="GET"?{body:new URLSearchParams(values).toString()}:{}),cache:"no-store",signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error("Stripe could not complete this test request. Jorrie should check the sandbox, restricted-key permissions and Connect settings.");return response.json();
}
export async function setupStatus(){const result=await adminRest("/rest/v1/rpc/v2_stripe_public_status",{method:"POST",body:"{}"});if(!result.ok)throw Error("Payment setup status is unavailable.");return result.json() as Promise<{configured:boolean;requested:boolean;mail_state:string|null;verified_at:string|null}>;}
export async function partnerOnboardingLink(company:string,account:string){const link=await stripeRequest<{url:string}>("account_links","POST",{account,type:"account_onboarding",refresh_url:`${STAGING_ORIGIN}/company/${company}/payments?refresh=1`,return_url:`${STAGING_ORIGIN}/company/${company}/payments?returned=1`});return stripeRedirect(link.url,"connect");}
export async function paymentAudit(actor:string,action:string){await write("/rest/v1/v2_stripe_audit",{actor_id:actor,action});}
