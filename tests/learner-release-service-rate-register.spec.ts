import {describe,it,expect,vi,beforeEach} from "vitest";
import {baselineRateCatalogue,validateRateValues} from "@/lib/service-rate-register";
import {calculateServiceCosts,newServiceSelection} from "@/lib/service-costs";
import {extractPriceSignals,observationStatus} from "@/lib/service-rate-observations";
const mock=vi.hoisted(()=>({principal:vi.fn(async()=>({session:{user:{id:"principal"}}})),rest:vi.fn(async(_path:string,_init:RequestInit)=>new Response(JSON.stringify("new-version"))),isolate:vi.fn(),check:vi.fn(async()=>[])}));
vi.mock("@/server/services/platform-principals",()=>({requirePlatformPrincipal:mock.principal}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:mock.rest}));
vi.mock("@/server/environment-isolation",()=>({assertStagingIsolation:mock.isolate}));
vi.mock("@/server/services/check-service-rate-sources",()=>({checkServiceRateSources:mock.check}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {reviewServiceRates,checkServiceSources} from "@/server/actions/service-rate-register";
import {GET} from "../app/api/cron/service-costs/route";

describe("Central service cost register",()=>{
 beforeEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs();});
 it("looks up reviewed server rates, rejects stale selections and keeps the earlier snapshot unchanged",()=>{
  const s={...newServiceSelection(),enrolments:"50",reviewed:true,services:{supabase:{plan:"pro",units:"1",extra_monthly:"0",monthly:"1"}}};
  const old=calculateServiceCosts(s,"USD",true);
  const updated={...baselineRateCatalogue,version:"new-version",values:{...baselineRateCatalogue.values,"supabase.pro":"30"}};
  expect(()=>calculateServiceCosts(s,"USD",true,updated)).toThrow("catalogue changed");
  const result=calculateServiceCosts({...s,version:updated.version},"USD",true,updated);
  expect(result.estimate.hostingFixedCents).toBe(60);expect(old.estimate.hostingFixedCents).toBe(50);expect(old.snapshot.rateValues["supabase.pro"]).toBe("25");expect(s.enrolments).toBe("50");
 });
 it("looks up variable AI, AWS licence and Stripe rates instead of trusting client rate overrides",()=>{
  const c={...baselineRateCatalogue,values:{...baselineRateCatalogue.values,"aws.single":"5","ai.terra.input":"3","stripe.fixed":"0.40","stripe.ca_domestic":"3.1"}};
  const s={...newServiceSelection(c),enrolments:"1",cadFx:"1",services:{ai:{plan:"terra",input_tokens:"1000000",output_tokens:"0",extra_per_learner:"0"},aws:{licence:"single",months:"1",hours:"1",hourly:"1",evidence:"Ireland fleet quote",extra_monthly:"0"},stripe:{plan:"ca_domestic",extra_percent:"0",rate:"0",fixed:"0"}}};
  const r=calculateServiceCosts(s,"USD",false,c);expect(r.estimate.hostingFixedCents).toBe(900);expect(r.estimate.stripeFixedCents).toBe(40);expect(r.estimate.stripeRateBps).toBe(310);
 });
 it("requires the entire defined rate set and valid monetary/percentage units",()=>{
  expect(validateRateValues(baselineRateCatalogue.values)).toEqual(baselineRateCatalogue.values);
  expect(()=>validateRateValues({...baselineRateCatalogue.values,"stripe.fixed":"0.001"})).toThrow("two decimal");
  expect(()=>validateRateValues({...baselineRateCatalogue.values,"vercel.pro":"0"})).toThrow("positive");
  expect(()=>validateRateValues({...baselineRateCatalogue.values,"stripe.ca_fx":"100"})).toThrow("Check");
  expect(()=>validateRateValues({...baselineRateCatalogue.values,extra:"1"})).toThrow("every listed");
 });
 it("extracts bounded price observations without treating scripts or arbitrary text as approved prices",()=>{
  expect(extractPriceSignals('<script>$999</script><p>USD 25 per month, $20 and 2.9%.</p>')).toEqual(["$20","2.9%","USD 25"]);
  expect(extractPriceSignals('<p>No published quote. Contact sales.</p>')).toEqual([]);
  expect(observationStatus(undefined,"one")).toBe("observed");expect(observationStatus("one","one")).toBe("unchanged");expect(observationStatus("one","two")).toBe("changed");
 });
 it("does not write rates without principal permission and explicit reviewed evidence",async()=>{
  mock.principal.mockRejectedValueOnce(Error("Principal required"));expect((await reviewServiceRates({},new FormData())).error).toContain("Principal");expect(mock.rest).not.toHaveBeenCalled();
  expect((await reviewServiceRates({},new FormData())).error).toContain("Confirm");expect(mock.rest).not.toHaveBeenCalled();
 });
 it("publishes through the transactional version check with the principal identity and rate evidence",async()=>{
  const f=new FormData();for(const [k,v] of Object.entries(baselineRateCatalogue.values))f.set(k,v);f.set("reviewed","on");f.set("version",baselineRateCatalogue.version);f.set("review_note","Official sources checked today; no price changes.");
  expect((await reviewServiceRates({},f)).success).toContain("new version");
  const payload=JSON.parse(mock.rest.mock.calls[0][1].body as string);expect(payload.p_actor).toBe("principal");expect(payload.p_expected).toBe(baselineRateCatalogue.version);expect(payload.p_values).toEqual(baselineRateCatalogue.values);
 });
 it("denies unauthenticated cron execution even if no secret was configured",async()=>{
  vi.stubEnv("CRON_SECRET","");expect((await GET(new Request("https://example.invalid"))).status).toBe(401);
  vi.stubEnv("CRON_SECRET","test-only-value");expect((await GET(new Request("https://example.invalid",{headers:{authorization:"Bearer wrong"}}))).status).toBe(401);expect(mock.check).not.toHaveBeenCalled();
  expect((await GET(new Request("https://example.invalid",{headers:{authorization:"Bearer test-only-value"}}))).status).toBe(200);expect(mock.check).toHaveBeenCalledOnce();
 });
 it("denies the manual source check for other users",async()=>{
  mock.principal.mockRejectedValueOnce(Error("Principal required"));expect((await checkServiceSources({})).error).toContain("could not");expect(mock.check).not.toHaveBeenCalled();
 });
});
