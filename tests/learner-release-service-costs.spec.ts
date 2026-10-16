import {describe,it,expect} from "vitest";
import {calculateServiceCosts,newServiceSelection,readServiceSelection,RATE_VERSION,type ServiceSelection} from "@/lib/service-costs";
import {allocationAtPrice,minimumCourseQuote} from "@/lib/commercial-planning";
function base():ServiceSelection {return {...newServiceSelection(),fxMode:"manual" as const,enrolments:"50",reviewed:true,services:{supabase:{plan:"pro",units:"1",extra_monthly:"0"},vercel:{plan:"pro",units:"1",extra_monthly:"0"}}};}
describe("Selected service cost estimates",()=>{
 it("allocates shared subscriptions once and does not add included credits as a second charge",()=>{
  const r=calculateServiceCosts(base(),"USD",true);expect(r.estimate.hostingFixedCents).toBe(90);expect(r.lines.map(l=>l.fixedCents)).toEqual([50,40]);expect(r.snapshot.catalogueVersion).toBe(RATE_VERSION);
  const s=base();s.services.vercel.units="2";expect(calculateServiceCosts(s,"USD").estimate.hostingFixedCents).toBe(130);
 });
 it("requires an enrolment denominator, a service and explicit foreign currency assumptions",()=>{
  expect(()=>calculateServiceCosts(newServiceSelection(),"USD")).toThrow("Tick");const s=base();s.enrolments="";expect(()=>calculateServiceCosts(s,"USD")).toThrow("positive whole");s.enrolments="50";expect(()=>calculateServiceCosts(s,"CAD")).toThrow("USD 1");s.usdFx="1.36";expect(calculateServiceCosts(s,"CAD").estimate.hostingFixedCents).toBe(123);
 });
 it("calculates Canada card routes and FX without silently treating CAD as USD",()=>{
  const s=base();s.services.stripe={plan:"ca_fx",extra_percent:"0"};expect(()=>calculateServiceCosts(s,"USD")).toThrow("CAD 1");s.cadFx="0.73";
  const r=calculateServiceCosts(s,"USD");expect(r.estimate.stripeFixedCents).toBe(22);expect(r.estimate.stripeRateBps).toBe(570);s.services.stripe.plan="ca_domestic";expect(calculateServiceCosts(s,"USD").estimate.stripeRateBps).toBe(290);
 });
 it("calculates AI tokens and AWS region-quoted hours plus licence and shared idle costs",()=>{
  const s=base();s.services={ai:{plan:"terra",input_tokens:"100000",output_tokens:"10000",extra_per_learner:"0"},aws:{evidence:"Ireland fleet quote",hourly:"0.25",hours:"10",months:"1",licence:"single",extra_monthly:"20",allocation_enrolments:"10"}};
  const r=calculateServiceCosts(s,"USD");expect(r.lines.find(l=>l.id==="ai")?.fixedCents).toBe(32);expect(r.lines.find(l=>l.id==="aws")?.fixedCents).toBe(869);
  delete s.services.aws.hourly;expect(()=>calculateServiceCosts(s,"USD")).toThrow("hourly");
 });
 it("requires source evidence for custom rates and does not turn blank allowances into zero",()=>{
  const s=base();s.services={render:{plan:"custom",units:"1",monthly:"12",extra_monthly:"0"}};expect(()=>calculateServiceCosts(s,"USD")).toThrow("reference");s.services.render.evidence="invoice Oct";expect(calculateServiceCosts(s,"USD").estimate.hostingFixedCents).toBe(24);s.services.render.extra_monthly="";expect(()=>calculateServiceCosts(s,"USD")).toThrow();
 });
 it("blocks unreviewed and stale selections and rejects malformed inputs",()=>{
  const s=base();s.reviewed=false;expect(()=>calculateServiceCosts(s,"USD",true)).toThrow("Confirm");s.reviewed=true;s.version="old";expect(()=>calculateServiceCosts(s,"USD")).toThrow("catalogue changed");
  expect(()=>readServiceSelection('{"services":[]}')).toThrow();expect(()=>readServiceSelection(JSON.stringify({...base(),services:{rogue:{plan:"pro"}}}))).toThrow("listed");
  const invalid=base();invalid.services.supabase.units="1e3";expect(()=>calculateServiceCosts(invalid,"USD")).toThrow();
 });
 it("reconciles the calculated service costs with the agreed cost-first distribution",()=>{
  const s=base();s.services.stripe={plan:"custom",rate:"2.9",fixed:"0.30",extra_percent:"0",evidence:"account quote"};
  const r=calculateServiceCosts(s,"USD",true),p={...r.estimate,minimumApgiCents:10000,apgiShareBps:2000,recoveryBps:2500,outstandingCents:100000};const q=minimumCourseQuote(p);
  expect(q.costs+q.contingency+q.administration+q.recovery+q.apgi+q.partner).toBe(q.price);expect(q.administration).toBe(Math.ceil(q.costs*.06));expect(q.apgi).toBeGreaterThanOrEqual(10000);expect(allocationAtPrice(q.price-1,p).apgi).toBeLessThan(10000);
 });
});
