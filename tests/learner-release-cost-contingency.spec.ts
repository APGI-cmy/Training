import {describe,it,expect} from "vitest";
import {allocationAtPrice,minimumCourseQuote,costEstimate,type PlanningInput} from "@/lib/commercial-planning";
import {newServiceSelection,readServiceSelection,calculateServiceCosts} from "@/lib/service-costs";
const base:PlanningInput={hostingFixedCents:1000,hostingRateBps:0,stripeFixedCents:0,stripeRateBps:0,administrationBps:600,contingencyBps:1000,minimumApgiCents:10000,apgiShareBps:10000,recoveryBps:0,outstandingCents:0};
describe("Other-cost contingency",()=>{
 it("reserves ten percent of service costs once, without administration on the reserve or a percentage of the course fee",()=>{
  const q=minimumCourseQuote(base);expect(q).toMatchObject({price:11160,costs:1000,contingency:100,administration:60,apgi:10000,partner:0});
  expect(q.costs+q.contingency+q.administration+q.recovery+q.apgi+q.partner).toBe(q.price);
 });
 it("includes percentage processing fees in the cost basis and takes recovery from the pool after the reserve",()=>{
  const input={...base,stripeFixedCents:30,stripeRateBps:290,recoveryBps:2500,outstandingCents:100000,apgiShareBps:2000};const q=minimumCourseQuote(input);
  expect(q.contingency).toBe(Math.ceil(q.costs*.1));expect(q.administration).toBe(Math.ceil(q.costs*.06));expect(q.available).toBe(q.price-q.costs-q.contingency-q.administration);expect(q.recovery).toBe(Math.floor(q.available*.25));
  expect(q.costs+q.contingency+q.administration+q.recovery+q.apgi+q.partner).toBe(q.price);expect(allocationAtPrice(q.price-1,input).apgi).toBeLessThan(10000);
 });
 it("finds the actual first affordable cent under processing, administration, contingency and share rounding",()=>{
  for(let i=0;i<24;i++){
    const input={...base,hostingFixedCents:i*2,stripeFixedCents:i%5,hostingRateBps:i%2?120:0,stripeRateBps:i%3?290:0,contingencyBps:i%4?1000:0,minimumApgiCents:100+i,apgiShareBps:[2000,4000,10000][i%3],recoveryBps:2500,outstandingCents:i%2?45:100000};
    const q=minimumCourseQuote(input);let first=0;while(allocationAtPrice(first,input).apgi<input.minimumApgiCents)first++;expect(q.price).toBe(first);
  }
 });
 it("adds the reserve to old working selections while preserving entered usage and requiring a fresh acknowledgement",()=>{
  const s={...newServiceSelection(),fxMode:"manual" as const,enrolments:"37",reviewed:true,services:{vercel:{plan:"pro",units:"2",extra_monthly:"12"}}};delete s.contingency;
  const parsed=readServiceSelection(JSON.stringify(s));expect(parsed.contingency).toBe("10");expect(parsed.enrolments).toBe("37");expect(parsed.services).toEqual(s.services);expect(parsed.reviewed).toBe(false);expect(()=>calculateServiceCosts(parsed,"USD",true)).toThrow("Confirm");
 });
 it("does not add a contingency to older saved aggregate estimates or silently recalculate their totals",()=>{
  const saved={hosting_fixed:"10",hosting_rate:"0",stripe_fixed:"0",stripe_rate:"0",administration_rate:"6"};expect(costEstimate(saved).contingencyBps).toBe(0);expect(minimumCourseQuote({...base,...costEstimate(saved)}).price).toBe(11060);
 });
 it("rejects invalid reserves and supports a deliberately reviewed zero reserve",()=>{
  expect(()=>minimumCourseQuote({...base,contingencyBps:10001})).toThrow();expect(()=>minimumCourseQuote({...base,contingencyBps:-1})).toThrow();
  const s={...newServiceSelection(),fxMode:"manual" as const,enrolments:"1",contingency:"0",reviewed:true,services:{vercel:{plan:"pro",units:"1",extra_monthly:"0"}}};expect(calculateServiceCosts(s,"USD",true).estimate.contingencyBps).toBe(0);
  s.contingency="";expect(()=>calculateServiceCosts(s,"USD",true)).toThrow();
 });
});
