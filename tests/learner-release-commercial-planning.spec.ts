import { describe, it, expect, vi, beforeEach } from "vitest";
import { allocationAtPrice, applicableApgiShare, costEstimate, minimumCourseQuote, moneyCents, percentageBps, resolvePlanSharing, restoreSharingModel, validatePlanOwnership, type PlanningInput } from "@/lib/commercial-planning";
import { reviewerEmails, policyScopeLabel } from "@/lib/company-structure";
import { publicationReturnPath } from "@/lib/publication-return";
import { newServiceSelection } from "@/lib/service-costs";
vi.mock("@/server/services/service-rate-register",async()=>({currentRateCatalogue:async()=>(await import("@/lib/service-rate-register")).baselineRateCatalogue}));
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
function plan(){const f=new FormData();for(const [k,v]of Object.entries({organisation_id:"22222222-2222-4222-8222-222222222222",rights_holder:"11111111-1111-4111-8111-111111111111",ownership_model:"apgi_until_recovered",client_owner_id:"22222222-2222-4222-8222-222222222222",cost_profile_id:"33333333-3333-4333-8333-333333333333",course_id:"scannex-training-programme",designer_name:"Example Designer",designer_company:"Example Design Company",currency:"USD",development_status:"recover",development_cost:"10000",already_paid:"0",minimum_apgi_income:"100",recovery_rate:"25",sharing_model:"owner",minimum_course_price:"1"}))f.set(k,v);return f;}
describe("Server recalculation of submitted drafts",()=>{
 beforeEach(()=>{fixture.configuration.currency="USD";});
 it("calculates selected services on the server and preserves an auditable snapshot without a saved profile",async()=>{
  const f=plan();f.set("cost_mode","services");f.delete("cost_profile_id");
  const selection={...newServiceSelection(),fxMode:"manual" as const,enrolments:"50",reviewed:true,services:{supabase:{plan:"pro",units:"1",extra_monthly:"0",monthly:"0"},vercel:{plan:"pro",units:"1",extra_monthly:"0"}}};
  f.set("service_costs",JSON.stringify(selection));const config=await coursePlanConfiguration(f);
  expect(config.cost_profile_id).toBeNull();expect(config.hosting_fixed).toBe("0.90");expect(config.minimum_course_price).not.toBe("1.00");expect(config.contingency_rate).toBe("10.00");expect(config.estimated_contingency).toBe("0.09");
  const snapshot=JSON.parse(config.service_cost_snapshot!);expect(snapshot.lines).toHaveLength(2);expect(snapshot.lines[0].source).toBe("https://supabase.com/pricing");expect(config.estimated_apgi_income).toBe("100.00");
  selection.reviewed=false;f.set("service_costs",JSON.stringify(selection));await expect(coursePlanConfiguration(f)).rejects.toThrow("Confirm");
 });
 it("ignores a forged browser price and recovers from the partner share without reducing ongoing APGI income",async()=>{
  const config=await coursePlanConfiguration(plan());expect(config.minimum_course_price).toBe("510.60");expect(config.recovery_base).toBe("partner_share");expect(config.estimated_apgi_income).toBe("100.00");expect(config.estimated_recovery).toBe("100.00");expect(config.estimated_partner_income).toBe("300.00");expect(config.development_funder).toBe("APGI platform");expect(config).not.toHaveProperty("johan_share");expect(config).not.toHaveProperty("srms_share");
 });
 it("records design credit separately from legal ownership and requires it on new course plans",async()=>{
  const f=plan(),config=await coursePlanConfiguration(f);expect(config.designer_name).toBe("Example Designer");expect(config.designer_company).toBe("Example Design Company");expect(config.rights_holder_name).toBe("APGI");expect(config.terms_summary).toContain("does not itself transfer rights");
  f.delete("designer_name");await expect(coursePlanConfiguration(f)).rejects.toThrow("designer name");f.set("designer_name","Example Designer");f.delete("designer_company");await expect(coursePlanConfiguration(f)).rejects.toThrow("designer company");
 });
 it("rejects currency mismatch and an already-paid balance marked recoverable",async()=>{
  fixture.configuration.currency="CAD";await expect(coursePlanConfiguration(plan())).rejects.toThrow("same currency");fixture.configuration.currency="USD";const f=plan();f.set("already_paid","10000");await expect(coursePlanConfiguration(f)).rejects.toThrow("positive outstanding");
 });
 it("keeps a partner-owned course on the APGI storefront under a partner agreement",async()=>{
  const f=plan();f.set("organisation_id","11111111-1111-4111-8111-111111111111");f.set("rights_holder","22222222-2222-4222-8222-222222222222");f.set("ownership_model","partner_paid");f.set("development_status","paid");const config=await coursePlanConfiguration(f);expect(config.agreement_scope).toBe("partner");expect(config.contract_partner_id).toBe("22222222-2222-4222-8222-222222222222");expect(config.development_funder).toBe("APGI platform");
 });
 it("applies both partner defaults while APGI owns the course pending full recovery",async()=>{
  const f=plan();f.set("apgi_share","91");f.set("custom_shares","on");
  let config=await coursePlanConfiguration(f);expect(config.apgi_share).toBe("20.00");expect(config.platform_user_share).toBe("80.00");expect(config.tailored_reason).toBeNull();
  expect(config.ownership_model).toBe("apgi_until_recovered");expect(config.rights_holder_name).toBe("APGI");expect(config.client_owner_name).toBe("Partner");expect(config.terms_summary).toContain("Once the full price is recovered, ownership passes to Partner");
  f.set("sharing_model","apgi");config=await coursePlanConfiguration(f);expect(config.apgi_share).toBe("40.00");expect(config.platform_user_share).toBe("60.00");
 });
 it("requires and stores tailored percentages and the reason in the exact terms",async()=>{
  const f=plan();f.set("sharing_model","tailored");
  await expect(coursePlanConfiguration(f)).rejects.toThrow("Enter the APGI share");
  f.set("apgi_share","30");await expect(coursePlanConfiguration(f)).rejects.toThrow("Explain why");
  f.set("tailored_reason","Documented course-specific support arrangement.");f.set("platform_user_share","70");
  const config=await coursePlanConfiguration(f);expect(config.apgi_share).toBe("30.00");expect(config.platform_user_share).toBe("70.00");expect(config.terms_summary).toContain(config.tailored_reason!);
  f.set("platform_user_share","80");await expect(coursePlanConfiguration(f)).rejects.toThrow("total 100%");
 });
 it("keeps permanent APGI ownership distinct from ownership pending recovery",async()=>{
  const f=plan();f.set("ownership_model","apgi_permanent");await expect(coursePlanConfiguration(f)).rejects.toThrow("licensing percentages");
  f.set("sharing_model","tailored");f.set("apgi_share","40");f.set("tailored_reason","Company licence with retained APGI ownership.");
  const config=await coursePlanConfiguration(f);expect(config.client_owner_id).toBeNull();expect(config.terms_summary).toContain("APGI owns the course indefinitely");expect(config.terms_summary).not.toContain("ownership passes to");
 });
 it("records a paid-up client owner without a recovery deduction",async()=>{
  const f=plan();f.set("ownership_model","partner_paid");f.set("development_status","paid");
  await expect(coursePlanConfiguration(f)).rejects.toThrow("client as the current legal");
  f.set("rights_holder","22222222-2222-4222-8222-222222222222");const config=await coursePlanConfiguration(f);expect(config.recovery_rate).toBe("0");expect(config.already_paid).toBe(config.development_cost);expect(config.client_owner_name).toBe("Partner");expect(config.terms_summary).toContain("owns the course from the outset");
 });
 it("does not invent ownership conditions or a client for a new sale",async()=>{
  const f=plan();f.delete("ownership_model");await expect(coursePlanConfiguration(f)).rejects.toThrow("ownership / sale conditions");
  f.set("ownership_model","apgi_until_recovered");f.set("client_owner_id","11111111-1111-4111-8111-111111111111");await expect(coursePlanConfiguration(f)).rejects.toThrow("Name the client");
 });
});

describe("Sharing model restoration and ownership consistency",()=>{
 it("restores legacy standard partner drafts without switching on an empty override",()=>{
  expect(restoreSharingModel({agreement_scope:"partner",customer_source:"owner",apgi_share:"20.00"})).toBe("owner");
  expect(restoreSharingModel({agreement_scope:"partner",customer_source:"apgi",apgi_share:"40.00"})).toBe("apgi");
  expect(restoreSharingModel({customer_source:"owner",custom_shares:"on",apgi_share:""})).toBe("owner");
  expect(restoreSharingModel({customer_source:"owner",apgi_share:"30.00"})).toBe("tailored");
  expect(restoreSharingModel({sharing_model:"tailored",customer_source:"owner",apgi_share:"20"})).toBe("tailored");
 });
 it("requires a positive APGI share for its minimum income and a valid model",()=>{
  const x={model:"tailored",ownerIsApgi:false,brandIsApgi:false,reason:"Special terms"};
  expect(()=>resolvePlanSharing({...x,apgiShare:"0"})).toThrow("greater than 0%");expect(()=>resolvePlanSharing({...x,apgiShare:"101"})).toThrow("between 0 and 100%");expect(()=>resolvePlanSharing({...x,model:"unknown"})).toThrow("Choose");
 });
 it("rejects payment and legal-owner contradictions",()=>{
  expect(()=>validatePlanOwnership("apgi_until_recovered",true,"paid",true)).toThrow("outstanding");
  expect(()=>validatePlanOwnership("apgi_permanent",false,"paid",false)).toThrow("APGI to be");
  expect(()=>validatePlanOwnership("partner_paid",false,"recover",true)).toThrow("already paid");
 });
});

describe("Recovery from the client share, separately from APGI's ongoing income",()=>{
 const current={...input,recoveryBase:"partner_share" as const,hostingFixedCents:0,administrationBps:0};
 it("allocates a cleared pool of 100 as APGI 20, recovery 20, client 60",()=>{
  expect(allocationAtPrice(10000,current)).toMatchObject({available:10000,apgi:2000,recovery:2000,partner:6000});
 });
 it("caps the last recovery at the remaining balance and pays the released remainder to the client",()=>{
  expect(allocationAtPrice(10000,{...current,outstandingCents:350})).toMatchObject({apgi:2000,recovery:350,partner:7650});
  expect(allocationAtPrice(10000,{...current,outstandingCents:0})).toMatchObject({apgi:2000,recovery:0,partner:8000});
 });
 it("recovers 25% of the partner's 60% in the APGI-sourced model",()=>{
  expect(allocationAtPrice(10000,{...current,apgiShareBps:4000})).toMatchObject({apgi:4000,recovery:1500,partner:4500});
 });
 it("keeps the minimum ongoing APGI income and floor unchanged when recovery ends",()=>{
  const funded=minimumCourseQuote({...input,recoveryBase:"partner_share"});
  const recovered=minimumCourseQuote({...input,recoveryBase:"partner_share",outstandingCents:0});
  expect(funded.price).toBe(51060);expect(recovered.price).toBe(funded.price);expect(funded.apgi).toBe(10000);expect(funded.recovery).toBe(10000);expect(funded.partner).toBe(30000);expect(recovered.partner).toBe(40000);
 });
 it("balances cent rounding, actual costs and both standard or tailored shares",()=>{
  for(const share of [2000,3250,4000])for(const balance of [0,1,350,100000]){
   const x={...input,recoveryBase:"partner_share" as const,apgiShareBps:share,outstandingCents:balance,stripeFixedCents:30,stripeRateBps:290,contingencyBps:1000};const q=minimumCourseQuote(x);
   expect(q.apgi).toBe(Math.floor(q.available*share/10000));expect(q.recovery).toBe(Math.min(balance,Math.floor((q.available-q.apgi)*.25)));expect(q.price).toBe(q.costs+q.administration+q.contingency+q.recovery+q.apgi+q.partner);expect(allocationAtPrice(q.price-1,x).apgi).toBeLessThan(10000);
  }
 });
});
