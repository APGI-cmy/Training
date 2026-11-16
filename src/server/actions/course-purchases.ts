'use server';
import {requireSession} from '@/server/auth/session';
import {requirePlatformPrincipal} from '@/server/services/platform-principals';
import {rows,write} from '@/server/services/company-structure';
import {storedEdition} from '@/server/services/course-editions';
import {offerPrice,type PurchaseOffer,type PurchaseOrder} from '@/server/services/course-purchases';
import {stripeRequest} from '@/server/services/stripe-platform';
import {stripeRedirect} from '@/lib/stripe-payments';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
import {adminRest} from '@/server/supabase/admin-rest';
import {revalidatePath} from 'next/cache';
import type {PaymentState} from './stripe-payments';
import {moneyCents} from '@/lib/commercial-planning';
const uuid=(value:FormDataEntryValue|null)=>{if(typeof value!=='string'||!/^[a-f0-9-]{36}$/.test(value))throw Error('Choose a valid record.');return value;};
const integer=(form:FormData,key:string,min:number,max:number)=>{const raw=String(form.get(key)??'');if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<min||Number(raw)>max)throw Error(`Check ${key.replaceAll('_',' ')}.`);return Number(raw);};
export async function setDefaultCourseAccess(_previous:PaymentState,form:FormData):Promise<PaymentState>{
 try{
  const {session}=await requirePlatformPrincipal(),course=String(form.get('course')??'');
  if(!/^[a-z0-9-]{1,120}$/.test(course)||form.get('confirm')!=='on')throw Error('Confirm the agreed terms for new enrolments.');
  const r=await adminRest('/rest/v1/rpc/v3_set_default_course_access',{method:'POST',body:JSON.stringify({p_actor:session.user.id,p_course:course,p_days:integer(form,'days',1,3650),p_reason:String(form.get('reason')??'').trim()})});
  if(!r.ok)throw Error('The access duration could not be saved. A verified edition and agreed terms are required.');
  revalidatePath(`/admin/courses/${course}/editions`);return {success:'Access duration saved for new enrolments only. Existing expiry dates and records are unchanged.'};
 }catch(error){return {error:error instanceof Error?error.message:'The duration could not be saved.'};}
}
export async function setCourseAccessExpiry(_previous:PaymentState,form:FormData):Promise<PaymentState>{
 try{
  const {session}=await requirePlatformPrincipal();
  if(form.get('confirm')!=='on')throw Error('Confirm that the expiry follows the learner’s agreed access terms.');
  const expiry=Date.parse(String(form.get('expiry')??''));if(!Number.isFinite(expiry))throw Error('Enter an expiry with its timezone.');
  const r=await adminRest('/rest/v1/rpc/v3_set_course_access_expiry',{method:'POST',body:JSON.stringify({p_actor:session.user.id,p_enrolment:uuid(form.get('enrolment')),p_expiry:new Date(expiry).toISOString(),p_reason:String(form.get('reason')??'').trim()})});
  if(!r.ok)throw Error('The expiry could not be saved. Provide the agreed terms and reason.');
  revalidatePath('/dashboard');revalidatePath('/admin/courses');return {success:'Expiry recorded with its reason. Learner results and saved assessments remain retained.'};
 }catch(error){return {error:error instanceof Error?error.message:'The expiry could not be saved.'};}
}
export async function saveCoursePurchaseOffer(_previous:PaymentState,form:FormData):Promise<PaymentState>{
 try{
  const {session}=await requirePlatformPrincipal(),edition=await storedEdition(uuid(form.get('edition')));
  if(!edition)throw Error('A verified edition is required.');
  const kind=String(form.get('kind'));if(!['ebook','refresher'].includes(kind))throw Error('Choose an offer type.');
  const books=kind==='ebook'?await rows<{path:string}>(`/rest/v1/course_edition_assets?edition_id=eq.${edition.id}&path=like.*book.pdf&content_type=eq.application/pdf&select=path&order=path.asc`):[];
  if(kind==='ebook'&&(!books.length||form.get('rights')!=='on'))throw Error('Confirm download rights for the edition’s e-books.');
  if(kind==='refresher'&&edition.runtime_course_id===edition.course_id)throw Error('A refresher requires a separate edition and fresh attempt identity.');
  const amount=moneyCents(String(form.get('amount')??''),'Offer price'),minimum=moneyCents(String(form.get('minimum')??''),'Approved minimum');
  if(amount<1||amount>10000000||minimum<1||minimum>amount)throw Error('Check the offer price and approved minimum.');
  const discount=kind==='refresher'?integer(form,'discount_percent',1,99)*100:0;
  const days=kind==='refresher'?integer(form,'access_days',1,3650):null;
  const valid=String(form.get('valid_until')??''),until=Date.parse(valid);
  if(!Number.isFinite(until)||until<=Date.now())throw Error('Choose a future offer expiry with its timezone.');
  const currency=String(form.get('currency')??'USD').toUpperCase();if(!['USD','CAD','ZAR'].includes(currency))throw Error('Choose USD, CAD or ZAR.');
  const offer={edition_id:edition.id,kind,title:`${edition.course_document.title} · ${kind==='ebook'?'E-book downloads':'Refresher'} · edition ${edition.edition_number}`,amount_cents:amount,minimum_cents:minimum,discount_bps:discount,currency,access_days:days,ebook_paths:books.map(b=>b.path),download_rights_confirmed:kind==='ebook',valid_until:new Date(until).toISOString(),enabled:false,created_by:session.user.id};
  offerPrice(offer);
  await write('/rest/v1/course_purchase_offers',offer);
  await write('/rest/v1/course_delivery_events',{actor_id:session.user.id,course_id:edition.course_id,event_type:'purchase_offer_prepared',detail:{edition:edition.id,kind,live_sales_enabled:false}});
  revalidatePath(`/admin/courses/${edition.course_id}/editions`);
  return {success:'Offer saved for sandbox verification. Live sales remain disabled; no learner was charged.'};
 }catch(error){return {error:error instanceof Error?error.message:'The offer could not be saved.'};}
}
export async function startCoursePurchase(_previous:PaymentState,form:FormData):Promise<PaymentState>{
 try{
  const session=await requireSession();await requirePlatformPrincipal();
  const id=uuid(form.get('offer'));
  const result=await adminRest('/rest/v1/rpc/v3_prepare_course_purchase',{method:'POST',body:JSON.stringify({p_actor:session.user.id,p_offer:id})});
  if(!result.ok)throw Error('A valid sandbox offer and eligible prior enrolment are required.');
  const order=await result.json() as PurchaseOrder;
  const checkout=order.checkout_id?await stripeRequest<{id:string;url:string;livemode:boolean}>(`checkout/sessions/${order.checkout_id}`):await stripeRequest<{id:string;url:string;livemode:boolean}>('checkout/sessions','POST',{
   mode:'payment','line_items[0][price_data][currency]':order.currency.toLowerCase(),'line_items[0][price_data][unit_amount]':String(order.amount_cents),'line_items[0][price_data][product_data][name]':`APGI sandbox ${order.kind} purchase`,'line_items[0][quantity]':'1',client_reference_id:order.id,'metadata[apgi_purchase_order]':order.id,'payment_intent_data[metadata][apgi_purchase_order]':order.id,
   success_url:`${STAGING_ORIGIN}/dashboard?purchase=returned`,cancel_url:`${STAGING_ORIGIN}/dashboard?purchase=cancelled`
  },`apgi-edition-purchase-${order.id}`);
  if(checkout.livemode!==false)throw Error('Live checkout is disabled.');
  const url=stripeRedirect(checkout.url,'checkout');
  await write(`/rest/v1/course_purchase_orders?id=eq.${order.id}&state=in.(pending,checkout)`,{checkout_id:checkout.id,state:'checkout'},'PATCH');
  return {success:'Sandbox checkout only. Test confirmation cannot grant real course or e-book access.',url};
 }catch(error){return {error:error instanceof Error?error.message:'The purchase could not be prepared.'};}
}
