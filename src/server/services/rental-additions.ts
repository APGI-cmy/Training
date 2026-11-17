import 'server-only';
import {rows} from './company-structure';
import {validId} from '@/lib/company-structure';
import {calculatorRpc,type CalculatorQuote} from './course-calculator';
import {quoteRentalAddition,type RentalAdditionBasis} from '@/lib/rental-additions';
import type {PricingStructure} from '@/lib/pricing-structures';
export async function checkedRentalAddition(s:PricingStructure,b:RentalAdditionBasis,actor:string){
 if(!await calculatorRpc<boolean>('cc_can_manage',{p_actor:actor,p_company:s.company.id}))throw Error('Company owner authority is required.');
 const order=(await rows<{id:string;quote_id:string;company_id:string;state:string;mode:string;funded_at:string}>(`/rest/v1/cc_orders?id=eq.${validId(b.originalOrderId)}&company_id=eq.${s.company.id}&select=id,quote_id,company_id,state,mode,funded_at&limit=1`))[0];
 if(!order||order.mode!=='test'||order.state!=='funded')throw Error('Choose an active funded sandbox rental.');
 const original=(await rows<CalculatorQuote>(`/rest/v1/cc_quotes?id=eq.${order.quote_id}&select=*&limit=1`))[0];
 if(original?.result.currency!==s.cost.currency)throw Error('The addition must use the original rental currency.');
 if(original?.input.route!=='subscription'||(original.input as unknown as {rentalAddition?:unknown}).rentalAddition||(original.result as unknown as {structureVersion?:string}).structureVersion!=='2026-11-17.3')throw Error('Choose an original rental using the current commercial model.');
 const ids=[...new Set(b.parentSeatIds.map(validId))].sort();if(!ids.length||ids.length>1000)throw Error('Choose up to 1,000 assigned rental places.');
 const seats=await rows<{id:string;learner_id:string|null;state:string;expires_at:string}>(`/rest/v1/cc_seats?order_id=eq.${order.id}&id=in.(${ids.join(',')})&select=id,learner_id,state,expires_at`);
 if(seats.length!==ids.length||seats.some(v=>!v.learner_id||v.state!=='active'||Date.parse(v.expires_at)<=Date.now()))throw Error('Only active assigned learners in the original rental can receive an addition.');
 if(original.courses.some(c=>c.editionId===s.courses[0].editionId))throw Error('That course is already included in the original rental.');
 const existing=await rows<{id:string}>(`/rest/v1/cc_seats?parent_seat_id=in.(${ids.join(',')})&added_edition_id=eq.${s.courses[0].editionId}&select=id&limit=1`);
 if(existing.length)throw Error('This course addition was already recorded for an affected learner.');
 const termEnd=seats[0].expires_at;if(seats.some(v=>v.expires_at!==termEnd))throw Error('Choose learner places sharing the same original term.');
 const basis={...b,parentSeatIds:ids,termStart:order.funded_at,termEnd,originalPlaces:original.input.seats,originalServiceCents:original.result.platformCents};
 // Frozen original service terms, current exact approved new content, and quote time.
 return quoteRentalAddition(s,basis);
}
