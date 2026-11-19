import {describe,it,expect} from 'vitest';
import {defaultStructure,quoteStructure,ROUTES} from '@/lib/pricing-structures';
import {sharedCourseQuote} from '@/lib/shared-course-pricing';
import type {CostSchedule,CreditCourse} from '@/lib/course-calculator';
const cost:CostSchedule={id:'cost',currency:'USD',monthlyPoolCents:76035,activeLearners:30,newEnrolments:10,variableCents:0,processorBps:370,processorFixedCents:22,source:'approved fixture',sourceDraftId:'draft',rates:{public:250,industry:750,client:1500},floors:{public:500,industry:2500,client:5000},margins:{public:2500,industry:4000,client:5500}};
const course:CreditCourse={id:'vpshr',editionId:'edition',courseId:'vpshr-level-0',title:'VPSHR',ownerId:'apgi',ownerIsApgi:true,scope:'public',hours:8,minimumCents:0,currency:'USD',evidence:'Recorded notional hours'};
const recipient={id:'partner',isApgi:false};
describe('Shared course margins cannot reduce owner and APGI obligations',()=>{
 it('keeps fixed allocations at every route and quantity while consuming only partner margin',()=>{
  const s=defaultStructure(cost,[course],{id:'apgi',isApgi:true}),frozen=JSON.stringify(s);
  for(const route of ROUTES)for(const n of route==='individual'?[1]:[10,20,50,100,500,1000]){
   const full=sharedCourseQuote(s,recipient,route,n),half=sharedCourseQuote(s,recipient,route,n,5000),zero=sharedCourseQuote(s,recipient,route,n,0);
   expect(full.locked.totalCents).toBe(quoteStructure(s,route,n).result.totalCents);
   for(const q of [half,zero]){expect(q.locked.apgiCents).toBe(full.locked.apgiCents);expect(q.locked.ownerCents).toBe(full.locked.ownerCents);expect(q.locked.platformCents).toBe(full.locked.platformCents);expect(q.locked.processingCents).toBe(full.locked.processingCents);expect(q.locked.totalCents+q.locked.discountCents).toBe(full.locked.totalCents);expect(q.locked.sellerCents).toBeGreaterThanOrEqual(0);}
   expect(zero.locked.discountCents).toBe(full.locked.originalSellerCents);
  }expect(JSON.stringify(s)).toBe(frozen);
 });
 it('preserves 80 owner 10 seller 10 APGI for partner-owned resale',()=>{const c={...course,ownerId:'other-owner',ownerIsApgi:false};const s=defaultStructure(cost,[c],{id:'other-owner',isApgi:false});const q=sharedCourseQuote(s,recipient,'individual',1,0);expect(q.locked.ownerCents).toBe(Math.floor(q.result.contentCents*.8));expect(q.locked.apgiCents).toBe(q.result.contentCents-q.locked.ownerCents-Math.floor(q.result.contentCents*.1));expect(q.locked.discountCents).toBe(Math.floor(q.result.contentCents*.1));});
 it('reserves absorbed processing before permitting a zero margin discount',()=>{const s=defaultStructure(cost,[course],{id:'apgi',isApgi:true});s.feeBearer='platform';const q=sharedCourseQuote(s,recipient,'individual',1,0);expect(q.locked.absorbedFeeReserveCents).toBe(q.result.estimatedProcessorCents);expect(q.locked.discountCents).toBe(q.locked.originalSellerCents-q.result.estimatedProcessorCents);expect(q.locked.totalCents).toBe(q.locked.apgiCents+q.locked.platformCents+q.result.estimatedProcessorCents);});
 it('rejects attempts to discount another recipient or extend one-course rights to a category wallet',()=>{const s=defaultStructure(cost,[course],{id:'apgi',isApgi:true});for(const bps of [-1,10001,NaN])expect(()=>sharedCourseQuote(s,recipient,'individual',1,bps)).toThrow();s.courses.push({...course,editionId:'second'});expect(()=>sharedCourseQuote(s,recipient,'individual',1)).toThrow('single-course');});
});
