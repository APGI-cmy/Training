import { describe,it,expect,vi,afterEach } from "vitest";
import { exchangeRate,currencyEquivalent,exchangeSource,parseExchangeFeed,validateExchangeQuote,type ExchangeQuote } from "@/lib/currency-rates";
import { calculateServiceCosts,newServiceSelection,readServiceSelection,type ServiceSelection } from "@/lib/service-costs";
import { baselineRateCatalogue,readRateValues,validateRateValues } from "@/lib/service-rate-register";
const mocks=vi.hoisted(()=>({principal:vi.fn(async()=>({})),isolation:vi.fn()}));
vi.mock("@/server/services/platform-principals",()=>({requirePlatformPrincipal:mocks.principal}));
vi.mock("@/server/environment-isolation",()=>({assertStagingIsolation:mocks.isolation}));
import { verifiedServiceExchange } from "@/server/services/currency-rates";
import { GET } from "../app/api/admin/currency-rates/route";
function feed(day=new Date().toISOString().slice(0,10)) {return {observations:[{d:day,FXUSDCAD:{v:"1.4196"},FXZARCAD:{v:"0.08589"},FXEURCAD:{v:"1.5912"},FXGBPCAD:{v:"1.8824"}}]};}
const quote=()=>parseExchangeFeed(feed())[0];
const ai=():ServiceSelection=>({...newServiceSelection(),enrolments:"20",fxQuote:quote(),reviewed:true,services:{ai:{plan:"luna",input_tokens:"1000000",output_tokens:"1000000",extra_per_learner:"0"},stripe:{plan:"ca_domestic",extra_percent:"0"}}});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();mocks.principal.mockResolvedValue({});});
describe("Automatic model prices and daily currency references",()=>{
 it("derives CAD, rand and reciprocal rates from the same dated observation",()=>{
  const q=quote();expect(exchangeRate(q,"USD","CAD")).toBe("1.419600");expect(exchangeRate(q,"CAD","USD")).toBe("0.704424");expect(exchangeRate(q,"USD","ZAR")).toBe("16.528117");
  expect(currencyEquivalent("100",q,"USD","CAD")).toBe("141.96");expect(currencyEquivalent("100",q,"USD","ZAR")).toBe("1652.81");expect(currencyEquivalent("141.96",q,"CAD","USD")).toBe("100.00");
  expect(currencyEquivalent("1.234567",q,"USD","ZAR")).toBe("20.41");expect(currencyEquivalent("",q,"USD","CAD")).toBe("—");
 });
 it("rejects zero, incomplete, invalid, future and expired source rates",()=>{
  const q=quote();expect(()=>validateExchangeQuote({...q,cadPerUnit:{...q.cadPerUnit,ZAR:"0"}})).toThrow("positive");
  expect(()=>validateExchangeQuote({...q,date:"2026-02-30"})).toThrow();
  expect(()=>validateExchangeQuote({...q,date:"2099-01-01"})).toThrow();
  expect(()=>validateExchangeQuote({...q,date:"2020-01-01"})).toThrow("seven days");
  expect(()=>validateExchangeQuote({...q,source:"https://untrusted.invalid"})).toThrow("source");
  const bad=feed();delete (bad.observations[0] as Partial<typeof bad.observations[0]>).FXZARCAD;expect(()=>parseExchangeFeed(bad)).toThrow("No recent complete");
 });
 it("keeps a latest complete business-day observation across weekends and holidays",()=>{
  const f=feed("2026-10-15");f.observations.push({d:"2026-10-16"} as typeof f.observations[0]);
  expect(parseExchangeFeed(f,Date.parse("2026-10-18T10:00:00Z"))[0].date).toBe("2026-10-15");
 });
 it("supplies Luna rates, ignores client price overrides and calculates token allowance in each currency",()=>{
  const s=ai();Object.assign(s.services.ai,{input_rate:"999",output_rate:"999"});
  const usd=calculateServiceCosts(s,"USD",true);expect(usd.lines[0].fixedCents).toBe(60);expect(usd.lines[0].source).toContain("gpt-6-luna");expect(usd.estimate.stripeFixedCents).toBe(22);
  const cad=calculateServiceCosts(s,"CAD",true);expect(cad.lines[0].fixedCents).toBe(86);expect(cad.estimate.stripeFixedCents).toBe(30);
  const zar=calculateServiceCosts(s,"ZAR",true);expect(zar.lines[0].fixedCents).toBe(992);expect(zar.estimate.stripeFixedCents).toBe(350);
 });
 it("retains explicit custom model quotes and earlier manual rates",()=>{
  const s=ai();s.fxMode="manual";s.cadFx="0.73";s.services.ai={plan:"custom",evidence:"Contracted model",input_rate:"1",output_rate:"2",input_tokens:"1000000",output_tokens:"0",extra_per_learner:"0"};
  expect(calculateServiceCosts(s,"USD").estimate.stripeFixedCents).toBe(22);expect(calculateServiceCosts(s,"USD").lines[0].fixedCents).toBe(100);
  const legacy={...s,fxMode:undefined};expect(readServiceSelection(JSON.stringify(legacy)).fxMode).toBe("manual");
  legacy.cadFx="USD";expect(readServiceSelection(JSON.stringify(legacy)).fxMode).toBe("auto");
  const blank=ai();blank.services.ai={plan:"custom",evidence:"GPT-6 Luna",input_rate:"",output_rate:"",input_tokens:"5000",output_tokens:"1000",extra_per_learner:"0"};const restored=readServiceSelection(JSON.stringify(blank));expect(restored.services.ai.plan).toBe("luna");expect(restored.services.ai.input_tokens).toBe("5000");expect(restored.reviewed).toBe(false);
  blank.services.ai.input_rate="0.2";expect(readServiceSelection(JSON.stringify(blank)).services.ai.plan).toBe("custom");
 });
 it("requires an available recent quote in automatic mode and freezes the one used in the snapshot",()=>{
  const s=ai();expect(()=>calculateServiceCosts({...s,fxQuote:undefined},"USD")).toThrow("Refresh");
  const saved=calculateServiceCosts(s,"USD").snapshot;
  s.fxQuote={...quote(),cadPerUnit:{...quote().cadPerUnit,USD:"1.5"}};
  expect(saved.currencyQuote?.cadPerUnit.USD).toBe("1.4196");expect(saved.cadFx).toBe("0.704424");
  expect(calculateServiceCosts(s,"USD").snapshot.cadFx).toBe("0.666667");
 });
 it("reads the earlier complete register during the additive Luna deployment, without relaxing rate writes",()=>{
  const old={...baselineRateCatalogue.values};delete old["ai.luna.input"];delete old["ai.luna.output"];
  expect(readRateValues(old)["ai.luna.input"]).toBe("0.10");expect(()=>validateRateValues(old)).toThrow();
  delete old["vercel.pro"];expect(()=>readRateValues(old)).toThrow();
 });
 it("verifies the displayed historical quote server-side rather than trusting client conversions",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify(feed()))));
  const s=ai();const result=await verifiedServiceExchange({...s,usdFx:"999",cadFx:"999"},"ZAR");
  expect(result.usdFx).toBe("16.528117");expect(result.cadFx).toBe("11.642799");
  const forged={...s,fxQuote:{...quote(),cadPerUnit:{...quote().cadPerUnit,USD:"0.1"}}};
  await expect(verifiedServiceExchange(forged,"USD")).rejects.toThrow("could not be verified");
 });
 it("retains a quoted business day when a newer daily rate is published before saving",async()=>{
  const now=new Date(),older=new Date(now.getTime()-86400000).toISOString().slice(0,10);
  const f=feed(older);f.observations.push({...feed().observations[0],FXUSDCAD:{v:"1.5"}});
  vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify(f))));
  const s={...ai(),fxQuote:parseExchangeFeed(feed(older))[0]};const result=await verifiedServiceExchange(s,"CAD");expect(result.usdFx).toBe("1.419600");expect(result.fxQuote?.date).toBe(older);
 });
 it("restricts source retrieval to principals and returns an explicit source failure",async()=>{
  const fetch=vi.fn(async()=>new Response(JSON.stringify(feed())));vi.stubGlobal("fetch",fetch);
  mocks.principal.mockRejectedValueOnce(Error("Principal required"));expect((await GET()).status).toBe(403);expect(fetch).not.toHaveBeenCalled();
  const response=await GET();expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toBe("private, no-store");expect((await response.json()).quote.source).toBe(exchangeSource);
  fetch.mockRejectedValueOnce(Error("Network unavailable"));expect((await GET()).status).toBe(503);
 });
});
