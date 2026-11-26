'use server';
import {createHash,randomBytes} from 'node:crypto';
import {parseWalletPurchase} from '@/lib/wallet-purchase-input';
import {revalidatePath} from 'next/cache';
import {validId,type StructureState} from '@/lib/company-structure';
import {quoteStructure,validateStructure,type PricingStructure,STRUCTURE_VERSION,ROUTES} from '@/lib/pricing-structures';
import {calculatorAccess,calculatorCourses,calculatorWalletCourses,calculatorPolicy,calculatorRpc,assertCalculatorCoursesPublished} from '@/server/services/course-calculator';
import {requirePlatformPrincipal} from '@/server/services/platform-principals';
import {rows,write} from '@/server/services/company-structure';
import {cartQuotes,pricingFingerprint,publishedStructure,shopAccess,verifyStructureQuote,shareableCost,type PurchaseBatch,type PriceRecord} from '@/server/services/pricing-structures';
import {type CostSchedule,type PurchaseRoute} from '@/lib/course-calculator';
import {stripeVault,stripeRequest} from '@/server/services/stripe-platform';
import {stripeRedirect} from '@/lib/stripe-payments';
import pricingPolicy from '@/data/course-pricing-policy.json';
import {assertNoSharedPriceRewrite} from '@/server/services/course-distribution';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
import {anchorPricingStructure,reviewQuantities,type PricingReview} from '@/lib/pricing-review';
import {reviewEmails} from '@/lib/review-requests';
import {calculatorPlanningPreview} from '@/server/services/calculator-planning-preview';
import {messageRpc} from '@/server/services/messages';
import {currentPricingReviews,flushReviewRequestMail} from '@/server/services/review-requests';
import {requireReviewRecord} from '@/server/services/course-reviews';
import {commercialReviewPath} from '@/lib/review-navigation';
import {partnerRetainer} from '@/server/services/partner-commercial-terms';
const field=(f:FormData,k:string)=>{const v=f.get(k);if(typeof v!=='string'||v.length>500000)throw Error('Check the form.');return v;};
const failure=(e:unknown):StructureState=>({error:e instanceof Error?e.message:'This change could not be saved.'});
function refresh(){for(const p of ['/course-calculator','/course-shop','/course-cart','/learning-balances'])revalidatePath(p);}
export async function submitPricingReview(_:StructureState,f:FormData):Promise<StructureState>{try{
 const a=await calculatorAccess(validId(field(f,'company'))),raw=JSON.parse(field(f,'document')) as PricingStructure;
 if(raw.version!==STRUCTURE_VERSION||!Array.isArray(raw.courses)||!raw.courses.length||raw.courses.length>100||!raw.categoryWallet)throw Error('Refresh and prepare a current four-option pricing proposal.');
 if(f.get('reviewed')!=='on')throw Error('Confirm this exact pricing proposal for review.');
 const preview=raw.cost?.id?.startsWith('estimate-')?await calculatorPlanningPreview(a.company):null;
 if(!a.priceEditor&&!(a.principal&&preview))throw Error('The course owner must submit pricing from their own company workspace.');
 const costRecord=preview?null:(await rows<{id:string;snapshot:CostSchedule}>(`/rest/v1/cc_cost_versions?snapshot->>currency=eq.USD&select=id,snapshot&order=created_at.desc&limit=1`))[0];
 const cost=preview?.costs[0]??(costRecord&&shareableCost(costRecord.id,costRecord.snapshot));
 if(!cost||raw.cost.id!==cost.id)throw Error('The platform cost version changed. Refresh before submitting.');
 const available=preview?.courses??(await calculatorCourses(a.company.id)).courses;
 const wallet=preview?.courses??await calculatorWalletCourses(a.company.id);
 const courses=raw.courses.map(c=>available.find(v=>v.id===c.id&&v.editionId===c.editionId&&v.courseId===c.courseId));
 if(courses.some(c=>!c))throw Error('Course records changed. Refresh before submitting.');
 const walletIds=raw.categoryWallet.catalogue.map(c=>c.id);
 if(wallet.length!==walletIds.length||wallet.some(c=>!walletIds.includes(c.id)))throw Error('Wallet courses changed. Refresh before submitting.');
 await assertNoSharedPriceRewrite(a.company.id,[...courses.filter(c=>!!c),...wallet].map(c=>c.courseId));
 const structure=anchorPricingStructure({
  version:STRUCTURE_VERSION,mode:raw.mode,company:{id:a.company.id,isApgi:a.company.slug==='apgi'},cost,
  courses:courses.filter(c=>!!c),paymentMethod:raw.paymentMethod,feeBearer:raw.feeBearer,
  offers:raw.offers,commercial:raw.commercial,categoryWallet:{...raw.categoryWallet,catalogue:wallet},
 });
 validateStructure(structure);
 const policy=preview?null:await calculatorPolicy(a.principal,a.session.user.id);
 if(!preview&&(!policy||policy.version!==pricingPolicy.version))throw Error('APGI must prepare the current pricing policy draft.');
 const reviewers=reviewEmails(field(f,'reviewers'));
 if(!preview){
  const approvers=await rows<{email:string}>('/rest/v1/platform_principals?select=email');
  if(approvers.some(p=>!reviewers.includes(p.email.toLowerCase())))throw Error('Include both platform pricing approvers so they can sign off the exact proposal.');
 }
 const reason=field(f,'reason').trim();
 if(reason.length<5||reason.length>5000)throw Error('Provide review instructions of 5 to 5,000 characters.');
 const primary=structure.courses[0],fingerprint=pricingFingerprint(structure),title=`Course pricing — ${primary.title}`.slice(0,200);
 const returnRound=f.get('review');
 let returnLink:string|undefined;
 if(typeof returnRound==='string'&&returnRound){
  const {round}=await requireReviewRecord(validId(returnRound));
  if(round.organisation_id!==a.company.id||round.course_id!==primary.courseId)throw Error('Select this review’s course in the individual price option before submitting.');
  returnLink=commercialReviewPath(round.id)+'#submitted-course-pricing';
 }
 const pricing:PricingReview={primaryCourseId:primary.courseId,fingerprint,structure,planningOnly:!!preview,quantities:reviewQuantities(structure,JSON.parse(field(f,'quantities')))};
 if(!structure.company.isApgi)pricing.retainer=await partnerRetainer(a.company,primary.courseId);
 const token=randomBytes(32).toString('hex');
 const saved=await messageRpc<{id:string;batch:string;existing?:boolean}>('v7_submit_pricing_review',{
  p_actor:a.session.user.id,p_policy:policy?.id??null,p_payload:{
   company:a.company.id,kind:'commercials',title,recipients:reviewers,reason,
   operationId:validId(field(f,'operation_id')),deadline:new Date(Date.now()+7*86400000).toISOString(),
   joinToken:token,joinHash:createHash('sha256').update(token).digest('hex'),
   snapshot:{pricing,items:[{id:'course-pricing',title,version:fingerprint,body:preview?'Planning proposal for commercial review. Buyer publication requires verified course and cost records.':'Review the four buyer options, the named courses and their exact price terms.'}]}
  }
 });
 let mail='Reviewer notifications are queued.';
 try{
  const {accepted}=await flushReviewRequestMail({batch:saved.batch,company:a.company.id});
  if(accepted>0)mail=`${accepted} reviewer email(s) accepted by the provider.`;
 }catch{/* The saved batch and its outbox can be retried. */}
 refresh();for(const p of ['/review-requests','/course-reviews','/notifications'])revalidatePath(p);
 return {success:`Pricing submitted to Commercials Review. ${mail}`,link:returnLink??`/review-requests?company=${a.company.id}&kind=commercials#batch-${saved.batch}`};
 }catch(e){return failure(e);}}
export async function pricingStructureDecision(_:StructureState,f:FormData):Promise<StructureState>{try{
 const {session}=await requirePlatformPrincipal(),id=validId(field(f,'structure'));
 const saved=(await rows<PriceRecord>(`/rest/v1/cc_price_structures?id=eq.${id}&select=*&limit=1`))[0];
 if(saved?.document.version!==STRUCTURE_VERSION)throw Error('This earlier allocation model needs a replacement proposal before approval or publication.');
 const {company}=await calculatorAccess(saved.company_id);
 if((await currentPricingReviews(company.id)).some(r=>r.primary_course===saved.document.courses[0].courseId))throw Error('Record your decision in the current Commercials Review proposal.');
 if(f.get('exact')!=='on')throw Error('Confirm this exact structure.');
 await calculatorRpc('cc_structure_decision',{p_actor:session.user.id,p_id:id,p_decision:field(f,'decision'),p_reason:field(f,'reason')});refresh();
 return {success:'Your decision is recorded. Publication is a separate step.'};
 }catch(e){return failure(e);}}
export async function publishPricingStructure(_:StructureState,f:FormData):Promise<StructureState>{try{
 const {session}=await requirePlatformPrincipal(),id=validId(field(f,'structure'));
 const saved=(await rows<PriceRecord>(`/rest/v1/cc_price_structures?id=eq.${id}&select=*&limit=1`))[0];
 if(saved?.document.version!==STRUCTURE_VERSION)throw Error('This earlier allocation model needs a replacement proposal before approval or publication.');
 const {company}=await calculatorAccess(saved.company_id);
 if(company.slug!=='apgi'){
  const owners=await rows<{user_id:string}>(`/rest/v1/organisation_memberships?organisation_id=eq.${company.id}&user_id=eq.${validId(saved.created_by)}&membership_role=eq.owner&is_active=eq.true&select=user_id&limit=1`);
  if(!owners.length)throw Error('Ask the current company owner to submit this price for review.');
 }
 const {courses}=await calculatorCourses(company.id);
 const selected=[...saved.document.courses,...(saved.document.categoryWallet?.catalogue??[])];
 if(!selected.length||selected.some(c=>c.ownerId!==company.id||!courses.some(allowed=>allowed.editionId===c.editionId&&allowed.courseId===c.courseId)))throw Error('The company’s course pricing authority has changed. Ask the owner to submit a new proposal.');
 if(f.get('publish')!=='on')throw Error('Confirm publication.');
 await calculatorRpc('cc_publish_structure',{p_actor:session.user.id,p_id:id});refresh();return {success:'The approved pricing structure is published for test quotes. Live payments remain disabled.'};
 }catch(e){return failure(e);}}
export async function addPricingQuote(_:StructureState,f:FormData):Promise<StructureState>{try{
 const a=await shopAccess(validId(field(f,'company'))),s=await publishedStructure(a.company.id,field(f,'course')),route=field(f,'route') as PurchaseRoute;
 if(!s||!ROUTES.includes(route))throw Error('No approved structure is published yet.');
 const seats=Number(field(f,'seats'));if(route==='wallet'&&s.document.categoryWallet&&!a.manager&&seats!==1)throw Error('Only a company manager may buy multiple named learner places.');
 const q=quoteStructure(s.document,route,seats,route==='wallet'&&s.document.categoryWallet?parseWalletPurchase(f.get('wallet_credit_cents'),f.get('wallet_categories'),s.document.categoryWallet):undefined);
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
