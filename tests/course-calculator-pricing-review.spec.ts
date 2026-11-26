import {describe,expect,it} from 'vitest';
import {anchorPricingStructure,reviewQuantities,shopOffer} from '@/lib/pricing-review';
import {defaultStructure,quoteStructure,selectOfferCourses} from '@/lib/pricing-structures';
import {withCategoryWallet} from '@/lib/category-wallet';
import {publicWalletQuote} from '@/lib/category-wallet-public';
import type {CostSchedule} from '@/lib/course-calculator';
import type {CreditCourse} from '@/lib/credit-course-metadata';

const company={id:'11111111-1111-4111-8111-111111111111',isApgi:true};
const cost:CostSchedule={id:'cost',sourceDraftId:'basis',currency:'USD',source:'Recorded costs',monthlyPoolCents:50000,activeLearners:30,newEnrolments:20,variableCents:0,processorBps:370,processorFixedCents:22,
 rates:{public:200,industry:300,client:400},floors:{public:500,industry:1000,client:1500},margins:{public:2500,industry:3500,client:4500}};
const courses:CreditCourse[]=['first','second'].map(name=>({id:name,editionId:name+'-1',courseId:name,title:name,ownerId:company.id,ownerIsApgi:true,hours:8,scope:'public',currency:'USD',minimumCents:0,evidence:'Recorded workload'}));

describe('A frozen buyer pricing review',()=>{
 it('identifies the exact individual offer without changing its bulk or annual course set',()=>{
  const initial=withCategoryWallet(defaultStructure(cost,courses,company),courses);
  const selected=selectOfferCourses(initial,'individual',['second-1']);
  const anchored=anchorPricingStructure(selected);
  expect(anchored.courses[0].courseId).toBe('second');
  for(const route of ['individual','seat_pack','subscription'] as const){
   const seats=selected.offers[route].minSeats;
   expect(quoteStructure(anchored,route,seats).courses.map(c=>c.courseId)).toEqual(quoteStructure(selected,route,seats).courses.map(c=>c.courseId));
  }
 });
 it('uses the buyer quote engine at the full slider bounds and retains the submitted starting quantities',()=>{
  const structure=anchorPricingStructure(withCategoryWallet(defaultStructure(cost,courses,company),courses));
  expect(reviewQuantities(structure,{individual:10,seat_pack:453,wallet:2,subscription:2000})).toMatchObject({individual:1,seat_pack:453,wallet:2,subscription:1000});
  for(const route of ['individual','seat_pack','subscription'] as const){
   const model=shopOffer(structure,route);
   for(const n of [model.min,model.max]){
    expect(model.prices[n-model.min][1]).toBe(quoteStructure(structure,route,n).result.totalCents);
   }
   expect(model.courses).toEqual(quoteStructure(structure,route,model.min).courses.map(c=>c.title));
  }
  const wallet=structure.categoryWallet!,purchase={faceCents:wallet.defaultFaceCents,categories:wallet.categories};
  expect(publicWalletQuote(structure,1,purchase).totalCents).toBe(quoteStructure(structure,'wallet',1,purchase).result.totalCents);
 });
});
