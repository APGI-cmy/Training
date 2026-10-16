import { describe, it, expect, vi, beforeEach } from "vitest";
import { allocationAtPrice, applicableApgiShare, costEstimate, minimumCourseQuote, moneyCents, percentageBps, type PlanningInput } from "@/lib/commercial-planning";
import { reviewerEmails, policyScopeLabel } from "@/lib/company-structure";
import { publicationReturnPath } from "@/lib/publication-return";
const input: PlanningInput = { minimumApgiCents:10000,apgiShareBps:2000,recoveryBps:2500,outstandingCents:1000000,hostingFixedCents:1000,hostingRateBps:0,stripeFixedCents:0,stripeRateBps:0,administrationBps:600 };
describe("Cost-first course price planning",()=>{
 it("prices backwards to the APGI minimum with recovery before the owner split",()=>{
  const q=minimumCourseQuote(input);
  expect(q).toMatchObject({price:67726,costs:1000,administration:60,available:66666,recovery:16666,apgi:10000,partner:40000});
  expect(allocationAtPrice(q.price-1,input).apgi).toBeLessThan(10000);
 });
 it("caps the final recovery and removes recovery when development is already repaid",()=>{
  expect(minimumCourseQuote({...input,outstandingCents:500})).toMatchObject({price:51560,recovery:500,apgi:10000,partner:40000});
  expect(minimumCourseQuote({...input,outstandingCents:0})).toMatchObject({price:51060,recovery:0,apgi:10000,partner:40000});
 });
 it("reconciles variable processing fees and never applies administration to the gross fee",()=>{
  const x={...input,stripeFixedCents:30,stripeRateBps:290,hostingRateBps:100};const q=minimumCourseQuote(x);
  expect(q.costs+q.administration+q.recovery+q.apgi+q.partner).toBe(q.price);
  expect(q.administration).toBe(Math.ceil(q.costs*.06));
  expect(allocationAtPrice(q.price-1,x).apgi).toBeLessThan(x.minimumApgiCents);
 });
 it("supports an APGI-only course without inventing a partner share",()=>{
  const q=minimumCourseQuote({...input,apgiShareBps:10000});expect(q.partner).toBe(0);expect(q.apgi).toBeGreaterThanOrEqual(input.minimumApgiCents);
 });
 it("retains third-party defaults and requires an explicit licence split for APGI-owned partner offerings",()=>{
  expect(applicableApgiShare(false,false,"owner")).toBe("20");expect(applicableApgiShare(false,false,"apgi")).toBe("40");expect(applicableApgiShare(true,true,"apgi")).toBe("100");expect(applicableApgiShare(true,false,"owner")).toBeNull();
 });
 it("does not turn missing cost assumptions into a zero-cost quotation",()=>{
  expect(()=>costEstimate({administration_rate:"6"})).toThrow("Unknown costs");
 });
 it.each(["-1","NaN","Infinity","1.234","1e2"])("rejects invalid monetary input %s",value=>expect(()=>moneyCents(value,"amount")).toThrow());
 it("rejects impossible percentage costs and invalid distributions",()=>{
  expect(()=>minimumCourseQuote({...input,hostingRateBps:9500})).toThrow("leave no revenue");
  expect(()=>minimumCourseQuote({...input,apgiShareBps:0})).toThrow();expect(()=>percentageBps("100.01","share")).toThrow();
 });
 it("finds a minimal reconciled quote across rates, cost profiles and repayment boundaries",()=>{
  for(const share of [2000,4000,10000])for(const balance of [0,1,500,1000000]){
   const x={...input,apgiShareBps:share,outstandingCents:balance,hostingRateBps:125,stripeRateBps:290,stripeFixedCents:30};const q=minimumCourseQuote(x);
   expect(q.apgi).toBeGreaterThanOrEqual(x.minimumApgiCents);expect(q.recovery).toBeLessThanOrEqual(balance);expect(allocationAtPrice(q.price-1,x).apgi).toBeLessThan(x.minimumApgiCents);expect(q.price).toBe(q.costs+q.administration+q.recovery+q.apgi+q.partner);
  }
 });
});
describe("Reviewer rows and safe branding return",()=>{
 it("does not mislabel a company agreement as internal when the company is inactive",()=>{
  expect(policyScopeLabel({visibility:"company",organisation_id:"retired"},[])).toContain("Company agreement");
  expect(policyScopeLabel({visibility:"internal",organisation_id:null},[])).toBe("Confidential internal");
 });
 it("reads separate email rows and preserves compatibility with pasted lists",()=>{
  const f=new FormData();f.append("reviewers","First@example.invalid");f.append("reviewers","second@example.invalid");expect(reviewerEmails(f)).toEqual(["first@example.invalid","second@example.invalid"]);
  f.set("reviewers","first@example.invalid, second@example.invalid");expect(reviewerEmails(f)).toHaveLength(2);
 });
 it("rejects duplicate identities, invalid addresses and excess rows",()=>{
  const f=new FormData();f.append("reviewers","a@example.invalid");f.append("reviewers","A@example.invalid");expect(()=>reviewerEmails(f)).toThrow("different");f.set("reviewers","invalid");expect(()=>reviewerEmails(f)).toThrow("valid");for(let i=0;i<21;i++)f.append("reviewers",`${i}@example.invalid`);expect(()=>reviewerEmails(f)).toThrow();
 });
 it("allows only known internal publication destinations",()=>{
  expect(publicationReturnPath("/admin/courses/scannex-training-programme/publish")).toBeTruthy();expect(publicationReturnPath("https://evil.invalid")).toBeNull();expect(publicationReturnPath("//evil.invalid")).toBeNull();expect(publicationReturnPath("/admin/courses/unknown/publish")).toBeNull();expect(publicationReturnPath("/admin/agreements?next=//evil.invalid")).toBeNull();
 });
});

const fixture=vi.hoisted(()=>({ configuration:{planning_version:"1",currency:"USD",hosting_fixed:"10",hosting_rate:"0",stripe_fixed:"0",stripe_rate:"0",administration_rate:"6"} as Record<string,string|null> }));
vi.mock("@/server/services/company-structure",()=>({requireCompany:vi.fn(async(id:string)=>({company:{id,slug:id.endsWith("1")?"apgi":"partner",name:id.endsWith("1")?"APGI":"Partner",brand_revision:3}})),rows:vi.fn(async()=>[{id:"33333333-3333-4333-8333-333333333333",configuration:fixture.configuration}])}));
import { coursePlanConfiguration } from "@/server/services/commercial-plan-configuration";
function plan(){const f=new FormData();for(const [k,v]of Object.entries({organisation_id:"22222222-2222-4222-8222-222222222222",rights_holder:"22222222-2222-4222-8222-222222222222",cost_profile_id:"33333333-3333-4333-8333-333333333333",course_id:"scannex-training-programme",currency:"USD",development_status:"recover",development_cost:"10000",already_paid:"0",minimum_apgi_income:"100",recovery_rate:"25",customer_source:"owner",minimum_course_price:"1"}))f.set(k,v);return f;}
describe("Server recalculation of submitted drafts",()=>{
 beforeEach(()=>{fixture.configuration.currency="USD";});
 it("ignores a forged browser price and stores the exact cost snapshot and new recovery order",async()=>{
  const config=await coursePlanConfiguration(plan());expect(config.minimum_course_price).toBe("677.26");expect(config.recovery_base).toBe("cost_cleared_pool");expect(config.development_funder).toBe("APGI platform");expect(config).not.toHaveProperty("johan_share");expect(config).not.toHaveProperty("srms_share");
 });
 it("rejects currency mismatch and an already-paid balance marked recoverable",async()=>{
  fixture.configuration.currency="CAD";await expect(coursePlanConfiguration(plan())).rejects.toThrow("same currency");fixture.configuration.currency="USD";const f=plan();f.set("already_paid","10000");await expect(coursePlanConfiguration(f)).rejects.toThrow("positive outstanding");
 });
 it("keeps a partner-owned course on the APGI storefront under a partner agreement",async()=>{
  const f=plan();f.set("organisation_id","11111111-1111-4111-8111-111111111111");const config=await coursePlanConfiguration(f);expect(config.agreement_scope).toBe("partner");expect(config.contract_partner_id).toBe("22222222-2222-4222-8222-222222222222");expect(config.development_funder).toBe("APGI platform");
 });
});
