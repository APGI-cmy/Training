'use server';
import {revalidatePath} from 'next/cache';
import {validId,type StructureState} from '@/lib/company-structure';
import {quoteStructure,validateStructure,type PricingStructure,STRUCTURE_VERSION,ROUTES} from '@/lib/pricing-structures';
import {calculatorAccess,calculatorCourses,calculatorPolicy,calculatorRpc,assertCalculatorCoursesPublished} from '@/server/services/course-calculator';
import {requirePlatformPrincipal} from '@/server/services/platform-principals';
import {rows,write} from '@/server/services/company-structure';
import {cartQuotes,pricingFingerprint,publishedStructure,shopAccess,verifyStructureQuote,shareableCost,type PurchaseBatch} from '@/server/services/pricing-structures';
import {type CostSchedule,type PurchaseRoute} from '@/lib/course-calculator';
import {stripeVault,stripeRequest} from '@/server/services/stripe-platform';
import {stripeRedirect} from '@/lib/stripe-payments';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
const field=(f:FormData,k:string)=>{const v=f.get(k);if(typeof v!=='string'||v.length>100000)throw Error('Check the form.');return v;};
const failure=(e:unknown):StructureState=>({error:e instanceof Error?e.message:'This change could not be saved.'});
function refresh(){for(const p of ['/course-calculator','/course-shop','/course-cart','/learning-balances'])revalidatePath(p);}
export async function savePricingStructure(_:StructureState,f:FormData):Promise<StructureState>{try{
 const a=await calculatorAccess(validId(field(f,'company'))),raw=JSON.parse(field(f,'document')) as PricingStructure;
 const cost=(await rows<{id:string;snapshot:CostSchedule}>(`/rest/v1/cc_cost_versions?id=eq.${validId(raw.cost.id)}&select=id,snapshot&limit=1`))[0];if(!cost)throw Error('Choose a recorded platform cost version.');
 const available=(await calculatorCourses(a.company.id,a.principal)).courses;
 const courses=raw.courses.map(c=>available.find(v=>v.id===c.id));if(courses.some(c=>!c))throw Error('Course records changed. Refresh before saving.');
 const s:PricingStructure={version:STRUCTURE_VERSION,mode:raw.mode,company:{id:a.company.id,isApgi:a.company.slug==='apgi'},cost:shareableCost(cost.id,cost.snapshot),courses:courses.filter(c=>!!c),paymentMethod:raw.paymentMethod,feeBearer:raw.feeBearer,offers:raw.offers};
 validateStructure(s);
 const policy=await calculatorPolicy(a.principal,a.session.user.id);if(!policy||policy.version!=='APGI-COMM-PRICE-001/1.2-draft')throw Error('APGI must prepare the new pricing policy draft first.');
 if(f.get('reviewed')!=='on')throw Error('Confirm the exact structure is ready for review.');
 const saved=(await write('/rest/v1/cc_price_structures',{company_id:a.company.id,created_by:a.session.user.id,policy_id:policy.id,document:s,fingerprint:pricingFingerprint(s)}))[0] as {id:string};refresh();return {success:'Four-option pricing structure saved for Johan and Jorrie’s review. Existing prices and approvals are unchanged.',link:`/course-calculator?company=${a.company.id}#structure-${saved.id}`};
 }catch(e){return failure(e);}}
export async function pricingStructureDecision(_:StructureState,f:FormData):Promise<StructureState>{try{const {session}=await requirePlatformPrincipal();if(f.get('exact')!=='on')throw Error('Confirm this exact structure.');await calculatorRpc('cc_structure_decision',{p_actor:session.user.id,p_id:validId(field(f,'structure')),p_decision:field(f,'decision'),p_reason:field(f,'reason')});refresh();return {success:'Your decision is recorded. Publication is a separate step.'};}catch(e){return failure(e);}}
export async function publishPricingStructure(_:StructureState,f:FormData):Promise<StructureState>{try{const {session}=await requirePlatformPrincipal();if(f.get('publish')!=='on')throw Error('Confirm publication.');await calculatorRpc('cc_publish_structure',{p_actor:session.user.id,p_id:validId(field(f,'structure'))});refresh();return {success:'The approved pricing structure is published for test quotes. Live payments remain disabled.'};}catch(e){return failure(e);}}
export async function addPricingQuote(_:StructureState,f:FormData):Promise<StructureState>{try{
 const a=await shopAccess(validId(field(f,'company'))),s=await publishedStructure(a.company.id),route=field(f,'route') as PurchaseRoute;
 if(!s||!ROUTES.includes(route))throw Error('No approved structure is published yet.');
 const q=quoteStructure(s.document,route,Number(field(f,'seats')));
 if(!await calculatorRpc<boolean>('cc_can_shop',{p_actor:a.session.user.id,p_company:a.company.id,p_route:route,p_courses:q.courses}))throw Error('This option is not available for your company role or course scope.');
 const body={structure_id:s.id,buyer_id:a.session.user.id,company_id:a.company.id,created_by:a.session.user.id,policy_id:s.policy_id,input:q.input,result:q.result,courses:q.courses,cost_snapshot:q.cost,expires_at:new Date(Date.now()+86400000).toISOString(),fingerprint:pricingFingerprint({structure:s.id,buyer:a.session.user.id,...q})};
 const saved=(await write('/rest/v1/cc_quotes',body))[0] as {id:string};await calculatorRpc('cc_cart_add',{p_actor:a.session.user.id,p_quote:saved.id});refresh();return {success:'Your exact test quote is in the cart, valid for 24 hours. No payment or enrolment was created.',link:`/course-cart?company=${a.company.id}`};
 }catch(e){return failure(e);}}
export async function removePricingQuote(_:StructureState,f:FormData):Promise<StructureState>{try{const a=await shopAccess(validId(field(f,'company')));await calculatorRpc('cc_cart_remove',{p_actor:a.session.user.id,p_cart:validId(field(f,'cart')),p_quote:validId(field(f,'quote'))});refresh();return {success:'Quote removed from your open cart.'};}catch(e){return failure(e);}}
export async function checkoutPricingCart(_:StructureState,f:FormData):Promise<StructureState>{try{
 const a=await shopAccess(validId(field(f,'company'))),cart=validId(field(f,'cart'));if(f.get('accept')!=='on')throw Error('Accept the itemised test quote and terms.');
 const existing=(await rows<PurchaseBatch>(`/rest/v1/cc_purchase_batches?cart_id=eq.${cart}&buyer_id=eq.${a.session.user.id}&select=*&limit=1`))[0];
 if(existing&&['funded','held','refunded'].includes(existing.state))throw Error('This payment is already recorded. Check your learning balances.');
 const quotes=await cartQuotes(cart,a.session.user.id);if(!quotes.length)throw Error('Your cart is empty.');
 for(const q of quotes){await verifyStructureQuote(q);await assertCalculatorCoursesPublished(q);}
 const b=await calculatorRpc<PurchaseBatch>('cc_prepare_batch',{p_actor:a.session.user.id,p_cart:cart});
 if(b.payment_method==='invoice'){refresh();return {success:'Unpaid test invoice request recorded. No bank payment was assumed and no learning allowance has been funded.'};}
 await stripeVault();
 const parameters:Record<string,string>={mode:'payment','payment_method_types[0]':'card',client_reference_id:b.id,'metadata[apgi_pricing_batch]':b.id,'payment_intent_data[metadata][apgi_pricing_batch]':b.id,success_url:`${STAGING_ORIGIN}/course-cart?company=${a.company.id}&checkout=returned`,cancel_url:`${STAGING_ORIGIN}/course-cart?company=${a.company.id}&checkout=cancelled`};
 quotes.forEach((q,i)=>{parameters[`line_items[${i}][price_data][currency]`]=b.currency.toLowerCase();parameters[`line_items[${i}][price_data][unit_amount]`]=String(q.result.totalCents);parameters[`line_items[${i}][price_data][product_data][name]`]=`APGI TEST ${q.input.route} · ${q.input.seats} learners · ${q.id.slice(0,8)}`;parameters[`line_items[${i}][quantity]`]='1';});
 const checkout=b.checkout_id?await stripeRequest<{id:string;url:string;livemode:boolean;status:string}>(`checkout/sessions/${b.checkout_id}`):await stripeRequest<{id:string;url:string;livemode:boolean;status:string}>('checkout/sessions','POST',parameters,`apgi-pricing-batch-${b.id}`);
 if(checkout.livemode!==false||checkout.status!=='open')throw Error('This sandbox checkout is closed. Existing receipts and balances remain retained.');
 const url=stripeRedirect(checkout.url,'checkout');await write(`/rest/v1/cc_purchase_batches?id=eq.${b.id}&state=in.(pending,checkout)`,{checkout_id:checkout.id,state:'checkout'},'PATCH');refresh();return {success:'Sandbox cart checkout is ready. Use test cards only. No live access or payout is authorised.',link:url};
 }catch(e){return failure(e);}}
