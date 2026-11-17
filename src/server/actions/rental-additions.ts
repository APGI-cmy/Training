'use server';
import {revalidatePath} from 'next/cache';
import {calculatorAccess} from '@/server/services/course-calculator';
import {publishedStructure,pricingFingerprint} from '@/server/services/pricing-structures';
import {checkedRentalAddition} from '@/server/services/rental-additions';
import {calculatorRpc} from '@/server/services/course-calculator';
import {write} from '@/server/services/company-structure';
import {validId,type StructureState} from '@/lib/company-structure';
export async function addRentalCourseQuote(_:StructureState,f:FormData):Promise<StructureState>{try{
 const a=await calculatorAccess(validId(String(f.get('company')))),s=await publishedStructure(a.company.id,String(f.get('course')));
 if(!s||s.document.version!=='2026-11-17.3')throw Error('Choose a current approved published content structure.');
 const q=await checkedRentalAddition(s.document,{originalOrderId:validId(String(f.get('order'))),parentSeatIds:f.getAll('seats').map(String),termStart:'',termEnd:'',addedAt:new Date().toISOString(),originalPlaces:0,originalServiceCents:0},a.session.user.id);
 if(f.get('reviewed')!=='on')throw Error('Confirm the affected learners and original end date.');
 const saved=(await write('/rest/v1/cc_quotes',{structure_id:s.id,buyer_id:a.session.user.id,company_id:a.company.id,created_by:a.session.user.id,policy_id:s.policy_id,input:q.input,result:q.result,courses:q.courses,cost_snapshot:q.cost,expires_at:new Date(Date.now()+86400000).toISOString(),fingerprint:pricingFingerprint({structure:s.id,buyer:a.session.user.id,...q})}))[0] as {id:string};
 await calculatorRpc('cc_cart_add',{p_actor:a.session.user.id,p_quote:saved.id});revalidatePath('/course-cart');
 return {success:'The additional-course quote is in your sandbox cart. It shows separate prorated service and content, ends with the original rental, and grants no access before verified payment.',link:`/course-cart?company=${a.company.id}`};
 }catch(e){return {error:e instanceof Error?e.message:'The rental addition could not be quoted.'};}}
