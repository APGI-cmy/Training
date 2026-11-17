'use server';
import {createHash} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {formText,validId,type StructureState} from '@/lib/company-structure';
import {moneyCents,percentageBps} from '@/lib/commercial-planning';
import {calculateCoursePrice,creditUnits,integer,type CalculatorInput,type CostSchedule} from '@/lib/course-calculator';
import {calculatorAccess,calculatorCourses,calculatorPolicy,calculatorRpc,assertCalculatorCoursesPublished,type CalculatorQuote,type CalculatorOrder} from '@/server/services/course-calculator';
import {requirePlatformPrincipal} from '@/server/services/platform-principals';
import {rows,write} from '@/server/services/company-structure';
import {stripeRequest,stripeVault} from '@/server/services/stripe-platform';
import {stripeRedirect} from '@/lib/stripe-payments';
import {STAGING_ORIGIN} from '@/server/environment-isolation';

const text=(form:FormData,key:string)=>formText(form,key,0,1000);
const number=(form:FormData,key:string)=>Number(text(form,key));
const money=(form:FormData,key:string)=>moneyCents(text(form,key),key.replaceAll('_',' '));
function failed(error:unknown):StructureState{return {error:error instanceof Error?error.message:'The calculator action could not be completed.'};}
function refresh(){revalidatePath('/course-calculator');revalidatePath('/learning-balances');}
export async function saveCalculatorCosts(_state:StructureState,form:FormData):Promise<StructureState>{
 try{
  const {session}=await requirePlatformPrincipal(),sourceDraftId=validId(text(form,'source_draft'));
  const source=(await rows<{configuration:Record<string,string|null>;title:string}>(`/rest/v1/commercial_agreement_drafts?id=eq.${sourceDraftId}&select=configuration,title&limit=1`))[0];
  if(!source||!['1'].includes(source.configuration.planning_version??''))throw Error('Choose a saved platform-costing record.');
  const currency=text(form,'currency');if(!['USD','CAD','ZAR'].includes(currency)||source.configuration.currency!==currency)throw Error('Use the same supported currency as the source cost record.');
  if(form.get('cost_reviewed')!=='on')throw Error('Confirm that monthly and per-enrolment costs are separated and not duplicated.');
  const snapshot:Omit<CostSchedule,'id'>&{moduleSnapshot:unknown}={currency,monthlyPoolCents:money(form,'monthly_pool'),activeLearners:integer(number(form,'active_learners'),'concurrent active learners',1,1000000),newEnrolments:integer(number(form,'new_enrolments'),'new paid enrolments per month',1,1000000),variableCents:money(form,'variable'),processorBps:percentageBps(text(form,'processor_percent'),'processing percentage'),processorFixedCents:money(form,'processor_fixed'),source:text(form,'source'),sourceDraftId,rates:{public:money(form,'rate_public'),industry:money(form,'rate_industry'),client:money(form,'rate_client')},floors:{public:money(form,'floor_public'),industry:money(form,'floor_industry'),client:money(form,'floor_client')},margins:{public:percentageBps(text(form,'margin_public'),'public margin'),industry:percentageBps(text(form,'margin_industry'),'industry margin'),client:percentageBps(text(form,'margin_client'),'client margin')},moduleSnapshot:source};
  if(snapshot.source.length<5||snapshot.processorBps>=10000||Object.values(snapshot.rates).some(n=>n<=0)||Object.values(snapshot.margins).some(n=>n>=10000))throw Error('Complete the cost evidence, positive rates and valid margins.');
  await write('/rest/v1/cc_cost_versions',{snapshot,created_by:session.user.id});refresh();return {success:'New cost and rate version saved for quotes. Existing prices remain unchanged; each new offer still requires approval.'};
 }catch(error){return failed(error);}
}
export async function saveCourseCredits(_state:StructureState,form:FormData):Promise<StructureState>{
 try{
  const {session}=await requirePlatformPrincipal(),editionId=validId(text(form,'edition')),ownerId=validId(text(form,'owner'));
  const edition=(await rows<{id:string;course_id:string;course_document:{title:string}}>(`/rest/v1/course_editions?id=eq.${editionId}&state=eq.ready&select=id,course_id,course_document&limit=1`))[0];
  if(!edition)throw Error('Choose a retained, ready course edition.');
  if(!(await rows<{id:string}>(`/rest/v1/organisations?id=eq.${ownerId}&is_active=eq.true&select=id`)).length)throw Error('Choose an active course owner.');
  const hours=number(form,'hours');creditUnits(hours);const scope=text(form,'scope'),currency=text(form,'currency'),evidence=text(form,'evidence');
  if(!['public','industry','client'].includes(scope)||!['USD','CAD','ZAR'].includes(currency)||evidence.length<10||form.get('credits_reviewed')!=='on')throw Error('Record scope, currency and evidence for the justified workload and ownership. Internal credits do not imply accreditation.');
  await write('/rest/v1/cc_credit_versions',{edition_id:editionId,owner_id:ownerId,created_by:session.user.id,snapshot:{courseId:edition.course_id,title:edition.course_document.title,scope,hours,currency,minimumCents:money(form,'minimum'),evidence}});
  refresh();return {success:'A new workload/credit version is saved for this edition. Earlier prices, credit snapshots and learner results are preserved.'};
 }catch(error){return failed(error);}
}
export async function saveCalculatorQuote(_state:StructureState,_form:FormData):Promise<StructureState>{
 return {error:'Prepare a proposal in the current four-option pricing workflow. Earlier quotes remain retained for history.'};
}
export async function calculatorDecision(_state:StructureState,form:FormData):Promise<StructureState>{
 try{const {session}=await requirePlatformPrincipal(),kind=text(form,'kind'),id=validId(text(form,'record')),decision=text(form,'decision'),reason=text(form,'reason');
  if(kind==='quote'){
   const q=(await rows<CalculatorQuote>(`/rest/v1/cc_quotes?id=eq.${id}&select=*&limit=1`))[0];if(!q)throw Error('Quote unavailable.');
   if(form.get('exact_version')!=='on')throw Error('Confirm that you reviewed this exact quote and its assumptions.');
  }
  await calculatorRpc('cc_record_decision',{p_actor:session.user.id,p_kind:kind,p_id:id,p_decision:decision,p_reason:reason});refresh();return {success:'Your own decision was recorded. The other principal must submit their own decision; no approval is inferred.'};
 }catch(error){return failed(error);}
}
export async function activateCalculatorPolicy(_state:StructureState,form:FormData):Promise<StructureState>{
 try{const {session}=await requirePlatformPrincipal();if(form.get('activate')!=='on')throw Error('Confirm publication of this approved policy version.');await calculatorRpc('cc_activate_policy',{p_actor:session.user.id,p_policy:validId(text(form,'policy'))});refresh();revalidatePath('/pricing-policy');return {success:'The exact approved policy is now published with its effective date. Live payments remain disabled.'};}catch(error){return failed(error);}
}
export async function calculatorCheckout(_state:StructureState,form:FormData):Promise<StructureState>{
 try{
  const access=await calculatorAccess(validId(text(form,'company'))),id=validId(text(form,'quote'));
  const q=(await rows<CalculatorQuote>(`/rest/v1/cc_quotes?id=eq.${id}&company_id=eq.${access.company.id}&select=*&limit=1`))[0];
  if(!q||form.get('accept_quote')!=='on')throw Error('Accept the exact company quote before preparing sandbox checkout.');
  await assertCalculatorCoursesPublished(q);await stripeVault();
  const order=await calculatorRpc<CalculatorOrder>('cc_prepare_order',{p_actor:access.session.user.id,p_quote:q.id});
  const checkout=order.checkout_id?await stripeRequest<{id:string;url:string;livemode:boolean}>(`checkout/sessions/${order.checkout_id}`):await stripeRequest<{id:string;url:string;livemode:boolean}>('checkout/sessions','POST',{mode:'payment','payment_method_types[0]':'card','line_items[0][price_data][currency]':q.result.currency.toLowerCase(),'line_items[0][price_data][unit_amount]':String(q.result.totalCents),'line_items[0][price_data][product_data][name]':`APGI SANDBOX ${q.input.route}: ${q.id}`,'line_items[0][quantity]':'1',client_reference_id:order.id,'metadata[apgi_calculator_order]':order.id,'payment_intent_data[metadata][apgi_calculator_order]':order.id,success_url:`${STAGING_ORIGIN}/course-calculator?company=${access.company.id}&checkout=returned`,cancel_url:`${STAGING_ORIGIN}/course-calculator?company=${access.company.id}&checkout=cancelled`},`apgi-calculator-${order.id}`);
  if(checkout.livemode!==false)throw Error('Live payments remain disabled.');const url=stripeRedirect(checkout.url,'checkout');
  await write(`/rest/v1/cc_orders?id=eq.${order.id}&state=in.(pending,checkout)`,{checkout_id:checkout.id,state:'checkout'},'PATCH');refresh();
  return {success:'Sandbox checkout is ready. Use Stripe test cards only. Test balances do not grant live course access or create learner results.',link:url};
 }catch(error){return failed(error);}
}
export async function assignCalculatorSeat(_state:StructureState,form:FormData):Promise<StructureState>{
 try{const access=await calculatorAccess(validId(text(form,'company'))),seat=validId(text(form,'seat')),learner=validId(text(form,'learner'));
  const s=(await rows<{order_id:string}>(`/rest/v1/cc_seats?id=eq.${seat}&select=order_id&limit=1`))[0];
  if(!s||!(await rows<{id:string}>(`/rest/v1/cc_orders?id=eq.${s.order_id}&company_id=eq.${access.company.id}&select=id`)).length)throw Error('Seat not available to this company.');
  await calculatorRpc('cc_assign_seat',{p_actor:access.session.user.id,p_seat:seat,p_learner:learner});refresh();return {success:'Named test place assigned. It cannot be silently moved to another learner.'};
 }catch(error){return failed(error);}
}
export async function redeemCalculatorCourse(_state:StructureState,form:FormData):Promise<StructureState>{
 try{const {requireSession}=await import('@/server/auth/session'),session=await requireSession();
  await calculatorRpc('cc_redeem',{p_actor:session.user.id,p_seat:validId(text(form,'seat')),p_edition:validId(text(form,'edition'))});refresh();return {success:'Test course redemption recorded once. The credit and money balances were updated together. Live learning records remain unchanged.'};
 }catch(error){return failed(error);}
}
