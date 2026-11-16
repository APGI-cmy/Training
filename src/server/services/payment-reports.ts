import "server-only";
import {requireSession,getUserRoles} from "@/server/auth/session";
import {isPlatformPrincipal} from "./platform-principals";
import {ownMemberships,rows} from "./company-structure";
import {paymentPortalEligible} from "@/lib/payment-reports";
import {validId} from "@/lib/company-structure";
import {adminRest} from "@/server/supabase/admin-rest";
export async function paymentPortalAccess(){
 const session=await requireSession();if(!session.user.email_confirmed_at)throw Error("Verify your account before opening payment records.");
 const [roles,owners]=await Promise.all([getUserRoles(session.accessToken),ownMemberships(session,true)]);
 if(!paymentPortalEligible(roles,owners.length>0))throw Error("Payment portals are unavailable to learner and viewing-only accounts.");
 const bound=await adminRest("/rest/v1/rpc/v2_bind_payment_recipient",{method:"POST",body:JSON.stringify({p_actor:session.user.id})});
 if(!bound.ok)throw Error("Your recipient identity could not be verified.");
 return {session,owners,principal:await isPlatformPrincipal(session)};
}
export const reportTables={orders:"Course payments",distributions:"Company distributions",recovery:"Development recovery",personal:"Personal payment allocations",profiles:"Recipient setup status",routes:"Company payment routes",legacy_orders:"Earlier payment records",legacy_allocations:"Earlier recipient allocations",legacy_batches:"Earlier payout batches",recipients:"Recipient planning register",settings:"Course price planning",events:"Earlier payment events",webhooks:"Stripe webhook status",audit:"Payment setup audit",requests:"APGI setup requests"} as const;
export type ReportTable=keyof typeof reportTables;
export type ReportInput={scope?:string;table?:string;page?:string;from?:string;to?:string};
export async function paymentReport(input:ReportInput){
 const access=await paymentPortalAccess(),scope=input.scope??(access.principal?"all":"self"),table=(input.table??(scope==="self"?"personal":"orders")) as ReportTable;
 if(!Object.hasOwn(reportTables,table))throw Error("Select a valid payment report.");
 if(scope==="all"){if(!access.principal)throw Error("Only Johan and Jorrie can view all payment records.");}
 else if(scope!=="self"){validId(scope);if(!access.principal&&!access.owners.some(m=>m.organisation_id===scope))throw Error("You can view reports only for your own company.");}
 const page=Number(input.page??"1");if(!Number.isInteger(page)||page<1||page>100000)throw Error("Select a valid report page.");
 const dates:Record<string,string>={};for(const k of ["from","to"] as const){if(input[k]){const value=input[k]!;if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw Error("Use a valid report date.");dates[k]=value;}}
 if(dates.from&&dates.to&&dates.to<dates.from)throw Error("The report end date must follow the start date.");
 const all=scope==="all",self=scope==="self";
 const globallyRestricted=["legacy_orders","recipients","settings","events","webhooks","audit","requests"];
 if(!all&&globallyRestricted.includes(table))throw Error("This report is reserved for Johan and Jorrie.");
 if(self&&!["personal","profiles","legacy_allocations","legacy_batches"].includes(table))throw Error("Select a personal payment report, or open an owned company’s reports.");
 const columns:Record<string,string[]>={
  orders:["id","created_at","buyer_id","company_id","course_id","amount","currency","state","hold_reason","checkout_id","payment_intent","charge_id","allocation"],
  distributions:["order_id","company_id","amount","currency","state","transfer_id"],recovery:["course_id","owner_id","currency","development","initial_paid","recovered"],
  profiles:["user_id","country","state","updated_at"],routes:["company_id","country","state","updated_at"],
  personal:["id","order_id","recipient_id","amount_cents","currency","allocation_status","provider_transfer_id","created_at"],
  legacy_allocations:["id","order_id","recipient_id","amount_cents","currency","allocation_status","provider_transfer_id","created_at"],
  legacy_batches:["id","recipient_id","course_id","amount_cents","currency","status","provider_payout_id","created_at"],
  legacy_orders:["id","course_id","learner_id","purchaser_email","amount_cents","currency","payment_status","provider","provider_payment_id","created_at"],
  recipients:["id","course_id","display_name","recipient_email","country_code","organisation_id","revenue_share_bps","payout_rule","onboarding_status","is_active"],
  settings:["course_id","price_cents","currency","tax_treatment","tax_notice","updated_at"],events:["id","order_id","provider_event_id","previous_status","next_status","source","created_at"],
  webhooks:["id","event_type","state","created_at"],audit:["id","actor_id","action","created_at"],requests:["id","requested_by","created_at","mail_state","provider_message_id"]
 };
 const sources:Record<ReportTable,string>={orders:"v2_stripe_orders",distributions:"v2_stripe_allocations",recovery:"v2_stripe_recovery_pools",profiles:"v2_stripe_personal_accounts",routes:"v2_stripe_partner_accounts",personal:"course_recipient_allocations",legacy_orders:"course_payment_orders",legacy_allocations:"course_recipient_allocations",legacy_batches:"course_recipient_payout_batches",recipients:"course_payment_recipients",settings:"course_commerce_settings",events:"course_payment_events",webhooks:"v2_stripe_webhook_events",audit:"v2_stripe_audit",requests:"v2_stripe_setup_requests"};
 let filter="";
 if((table==="personal"||table==="legacy_allocations"||table==="legacy_batches")&&!all){
  const recipients=await rows<{id:string}>(`/rest/v1/course_payment_recipients?select=id&${self?`recipient_user_id=eq.${access.session.user.id}`:`organisation_id=eq.${scope}`}`);
  if(!recipients.length)return {access,scope,table,page,columns:columns[table],records:[] as Record<string,unknown>[],hasMore:false,dates};
  filter=`&recipient_id=in.(${recipients.map(r=>r.id).join(",")})`;
 }else if(!all){
  const field=table==="recovery"?"owner_id":table==="profiles"?"user_id":"company_id";
  if(table==="profiles"&&!self)throw Error("Individual payout profiles are private to their owners; principals can see redacted setup status.");
  filter=`&${field}=eq.${self?access.session.user.id:scope}`;
 }
 const timestamp=columns[table].includes("created_at")?"created_at":columns[table].includes("updated_at")?"updated_at":null;
 if(timestamp&&dates.from)filter+=`&${timestamp}=gte.${dates.from}T00:00:00Z`;
 if(timestamp&&dates.to){const next=new Date(dates.to);next.setUTCDate(next.getUTCDate()+1);filter+=`&${timestamp}=lt.${encodeURIComponent(next.toISOString())}`;}
 const ordered=timestamp?`${timestamp}.desc,${columns[table][0]}.asc`:columns[table].slice(0,Math.min(columns[table].length,2)).map(c=>`${c}.asc`).join(",");
 const selection=table==="distributions"?columns[table].filter(c=>c!=="currency").join(",")+",payment_order:v2_stripe_orders(currency)":columns[table].join(",");
 const data=await rows<Record<string,unknown>>(`/rest/v1/${sources[table]}?select=${selection}${filter}&order=${ordered}&limit=51&offset=${(page-1)*50}`);
 return {access,scope,table,page,columns:columns[table],records:data.slice(0,50).map(row=>Object.fromEntries(columns[table].map(c=>[c,table==="distributions"&&c==="currency"?(row.payment_order as {currency?:string}|undefined)?.currency??null:row[c]??null]))),hasMore:data.length>50,dates};
}
