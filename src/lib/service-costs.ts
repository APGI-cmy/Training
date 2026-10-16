import { moneyCents, percentageBps, type CostEstimate } from "./commercial-planning";
import { baselineRateCatalogue, catalogueDate, rateAmount, type RateCatalogue } from "./service-rate-register";

// Reviewed public rate card; never refreshed implicitly inside an accepted agreement.
export const RATE_VERSION = "2026-10-16.1";
export const RATE_CHECKED = "16 October 2026";
type Plan = { id: string; label: string; monthly: string; note: string };
export type ServiceDefinition = { id: string; name: string; source: string; note: string; plans?: Plan[] };
export const costServices: ServiceDefinition[] = [
  { id:"supabase", name:"Supabase — database and accounts",source:"https://supabase.com/pricing",note:"Monthly organisation cost, shared across enrolments. Do not add the included Micro compute credit twice.",plans:[
    {id:"pro",label:"Pro, one Micro project — USD 25/month",monthly:"25",note:"Base organisation subscription with one Micro covered by compute credits. Extra projects, larger compute and overages need an additional allowance."},
  ]},
  { id:"vercel",name:"Vercel — platform hosting",source:"https://vercel.com/pricing",note:"Shared platform hosting. Developer seats are separate from learner seats.",plans:[
    {id:"pro",label:"Pro, one developer seat — USD 20/month",monthly:"20",note:"Includes USD 20 usage credit, not another USD 20 charge. Add extra developer seats and usage above included credits below."},
  ]},
  { id:"render",name:"Render — application services",source:"https://render.com/articles/render-vs-railway",note:"Compute instance estimate. Add any workspace, disk and excess bandwidth charges.",plans:[
    {id:"starter",label:"Starter instance — USD 7/month",monthly:"7",note:"One always-on 512 MB instance. Other charges are additional."},
    {id:"standard",label:"Standard instance — USD 25/month",monthly:"25",note:"One always-on 2 GB instance. Other charges are additional."},
  ]},
  { id:"resend",name:"Resend — invitation and account emails",source:"https://resend.com/pricing",note:"Choose the actual transactional email plan; add overage and domain charges when needed.",plans:[
    {id:"free",label:"Free — USD 0/month",monthly:"0",note:"Up to 3,000 emails/month and 100/day. Exceeding this requires another plan; zero applies only within these limits."},
    {id:"pro",label:"Pro — USD 20/month",monthly:"20",note:"50,000 emails/month. Extra emails USD 0.90 per 1,000; include expected overages below."},
    {id:"scale",label:"Scale — USD 90/month",monthly:"90",note:"100,000 emails/month. Extra emails and add-ons are additional."},
  ]},
  { id:"aws",name:"AWS — Scannex practice lab",source:"https://aws.amazon.com/workspaces/applications/pricing/",note:"Enter the hourly quote for the actual region and instance. The published US example is not an Ireland rate. Include idle capacity, image builders, networking and storage in the monthly allowance."},
  { id:"ai",name:"AI — learner assistance",source:"https://developers.openai.com/api/docs/models/gpt-5.6-terra",note:"Text API estimate. Select the model being budgeted; this does not enable AI. Output includes reasoning tokens. Tool calls, audio, images and storage need an extra allowance."},
  { id:"stripe",name:"Stripe — payment processing",source:"https://stripe.com/en-ca/pricing",note:"Canadian account card rates. Select the payment route and add any Connect, tax-service or other processing charges. Other account countries require your own rates."},
  { id:"other",name:"Other operating costs",source:"",note:"Use for domains, applicable provider tax, additional services or a documented reserve. Do not repeat costs already included above."},
];
export type ServiceInputs = Record<string,string>;
export type ServiceSelection = { version:string; enrolments:string; usdFx:string; cadFx:string; administration:string; reviewed:boolean; services:Record<string,ServiceInputs> };
export function newServiceSelection(catalogue:RateCatalogue=baselineRateCatalogue): ServiceSelection { return {version:catalogue.version,enrolments:"",usdFx:"",cadFx:"",administration:"6",reviewed:false,services:{}}; }
export function readServiceSelection(raw: string): ServiceSelection {
  if (!raw) return newServiceSelection();
  if(raw.length>24000) throw Error("The service selection is too large.");
  let value:unknown; try {value=JSON.parse(raw);} catch {throw Error("Re-enter the service selection.");}
  if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Re-enter the service selection.");
  const v=value as ServiceSelection;
  if(typeof v.version!=="string"||typeof v.reviewed!=="boolean"||!v.services||typeof v.services!=="object"||Array.isArray(v.services))throw Error("Re-enter the service selection.");
  for(const key of ["enrolments","usdFx","cadFx","administration"] as const)if(typeof v[key]!=="string"||v[key].length>40)throw Error("Check service assumptions.");
  for(const [id,fields] of Object.entries(v.services)) {
    if(!costServices.some(s=>s.id===id)||!fields||typeof fields!=="object"||Array.isArray(fields))throw Error("Choose a listed service.");
    if(Object.keys(fields).length>20||Object.values(fields).some(x=>typeof x!=="string"||x.length>500))throw Error("Check service details.");
  }
  return v;
}
const scale=BigInt(1000000);
const ceil=(a:bigint,b:bigint)=>(a+b-BigInt(1))/b;
function decimal(value:string,label:string,positive=false) {
  if(!/^\d{1,9}(\.\d{1,6})?$/.test(value))throw Error(`Enter ${label} (up to six decimal places).`);
  const [a,b=""]=value.split("."); const n=BigInt(a)*scale+BigInt(b.padEnd(6,"0"));
  if(positive&&n===BigInt(0))throw Error(`Enter a positive ${label}.`);return n;
}
function count(value:string,label:string) {if(!/^\d{1,7}$/.test(value)||Number(value)<1)throw Error(`Enter ${label} as a positive whole number.`);return BigInt(value);}
function tokens(value:string,label:string) {if(!/^\d{1,10}$/.test(value))throw Error(`Enter ${label} as a whole number, including zero if none.`);return BigInt(value);}
const moneyUsd=(v:string,label:string)=>BigInt(moneyCents(v,label))*BigInt(10000);
export type ServiceLine = {id:string;name:string;plan:string;source:string;basis:string;fixedCents:number;rateBps:number};
export function calculateServiceCosts(selection:ServiceSelection,currency:string,requireReviewed=false,catalogue:RateCatalogue=baselineRateCatalogue) {
  if(selection.version!==catalogue.version)throw Error("The pricing catalogue changed. Review the current service rates before saving.");
  if(!["USD","CAD","EUR","GBP","ZAR"].includes(currency))throw Error("Choose a supported course currency.");
  if(!Object.keys(selection.services).length)throw Error("Tick the services this course uses.");
  const enrolments=count(selection.enrolments,"expected monthly paid course enrolments");
  const administrationBps=percentageBps(selection.administration,"administration on costs");
  const needUsd=Object.keys(selection.services).some(id=>id!=="stripe");
  const usdFx=currency==="USD"?scale:needUsd?decimal(selection.usdFx,`value of USD 1 in ${currency}`,true):scale;
  const convert=(micro:bigint,fx:bigint)=>{const n=Number(ceil(micro*fx,BigInt(10000)*scale));if(!Number.isSafeInteger(n)||n>1e12)throw Error("Service estimate is too large.");return n;};
  const lines:ServiceLine[]=[];const normalised:ServiceSelection={...selection,services:{}};
  for(const service of costServices) {
    const f=selection.services[service.id];if(!f)continue;
    normalised.services[service.id]={...f};
    const group=f.allocation_enrolments?count(f.allocation_enrolments,`${service.name} sharing enrolments`):enrolments;
    let usd=BigInt(0),plan="",basis="",fixedCents=0,rateBps=0;
    if(service.plans) {
      const preset=service.plans.find(p=>p.id===f.plan);
      const custom=f.plan==="custom";
      if(!preset&&!custom)throw Error(`Choose the ${service.name} plan.`);
      if(custom&&(!f.evidence||f.evidence.trim().length<3))throw Error(`Record the quote or invoice reference for ${service.name}.`);
      const units=count(f.units,`${service.name} plan / instance quantity`);
      const amount=custom?f.monthly:rateAmount(catalogue,`${service.id}.${preset!.id}`);
      const monthly=moneyUsd(amount,`${service.name} monthly amount`)*units+moneyUsd(f.extra_monthly,`${service.name} additional monthly costs`);
      usd=ceil(monthly,group);plan=custom?"Own quoted monthly rate":preset!.label.replace(/USD [\d.]+\/month/,`USD ${amount}/month`);
      basis=`${units} × USD ${amount}/month + USD ${f.extra_monthly} additional/month, divided by ${group} paid enrolments.`;
    } else if(service.id==="aws") {
      if(!f.evidence||f.evidence.trim().length<3)throw Error("Record the AWS region, instance and quote reference.");
      const hours=decimal(f.hours,"AWS practice hours per enrolment",true),hourly=decimal(f.hourly,"AWS hourly USD quote",true);
      const months=count(f.months,"AWS licence months per enrolment");
      const licences:Record<string,string>={single:rateAmount(catalogue,"aws.single"),multi:rateAmount(catalogue,"aws.multi"),linux:rateAmount(catalogue,"aws.linux")};
      if(!Object.hasOwn(licences,f.licence))throw Error("Choose the AWS fleet licence.");
      usd=ceil(hours*hourly,scale)+moneyUsd(licences[f.licence],"AWS licence")*months+ceil(moneyUsd(f.extra_monthly,"AWS idle / other monthly allowance"),group);
      plan=`${f.licence} fleet; ${f.evidence}`;basis=`${f.hours} hours × USD ${f.hourly} + ${months} licence month(s) at USD ${licences[f.licence]} + USD ${f.extra_monthly}/month ÷ ${group}.`;
    } else if(service.id==="ai") {
      const terra=f.plan==="terra";if(!terra&&f.plan!=="custom")throw Error("Choose an AI rate model.");
      if(!terra&&(!f.evidence||f.evidence.trim().length<3))throw Error("Record the AI model and rate reference.");
      const input=decimal(terra?rateAmount(catalogue,"ai.terra.input"):f.input_rate,"AI input rate per million tokens"),output=decimal(terra?rateAmount(catalogue,"ai.terra.output"):f.output_rate,"AI output rate per million tokens");
      usd=ceil(tokens(f.input_tokens,"AI input tokens per enrolment")*input+tokens(f.output_tokens,"AI output tokens per enrolment")*output,BigInt(1000000))+moneyUsd(f.extra_per_learner,"AI other cost per enrolment");
      plan=terra?"GPT-5.6 Terra, standard short-context text":`Own model rates: ${f.evidence}`;
      basis=`${f.input_tokens} input tokens × USD ${Number(input)/1e6}/million + ${f.output_tokens} output/reasoning tokens × USD ${Number(output)/1e6}/million + USD ${f.extra_per_learner} other usage.`;
    } else if(service.id==="stripe") {
      const routes:Record<string,string>={ca_domestic:rateAmount(catalogue,"stripe.ca_domestic"),ca_international:rateAmount(catalogue,"stripe.ca_international"),ca_fx:rateAmount(catalogue,"stripe.ca_fx")};
      const custom=f.plan==="custom";if(!custom&&!Object.hasOwn(routes,f.plan))throw Error("Choose the Stripe account and card route.");
      if(custom&&(!f.evidence||f.evidence.trim().length<3))throw Error("Record the Stripe country and rate reference.");
      const extra=percentageBps(f.extra_percent,"additional Stripe charges");
      rateBps=percentageBps(custom?f.rate:routes[f.plan],"Stripe percentage")+extra;
      if(rateBps>10000)throw Error("Stripe charges must not exceed 100%.");
      if(custom)fixedCents=moneyCents(f.fixed,"Stripe fixed fee in course currency");
      else {const fx=currency==="CAD"?scale:decimal(selection.cadFx,`value of CAD 1 in ${currency}`,true);fixedCents=convert(moneyUsd(rateAmount(catalogue,"stripe.fixed"),"Stripe fixed CAD fee"),fx);}
      plan=custom?`Own Stripe rate: ${f.evidence}`:f.plan=== "ca_domestic"?"Canada / domestic cards":f.plan==="ca_international"?"Canada / international cards":"Canada / international cards with currency conversion";
      basis=`${rateBps/100}% of price + ${currency} ${(fixedCents/100).toFixed(2)} per successful payment. Add Connect and other applicable charges separately.`;
    } else {
      if(!f.evidence||f.evidence.trim().length<3)throw Error("Describe the other operating costs and their basis.");
      usd=moneyUsd(f.per_learner,"other cost per enrolment")+ceil(moneyUsd(f.monthly,"other shared monthly costs"),group);
      plan=f.evidence;basis=`USD ${f.per_learner} per enrolment + USD ${f.monthly}/month ÷ ${group}.`;
    }
    if(service.id!=="stripe")fixedCents=convert(usd,usdFx);
    lines.push({id:service.id,name:service.name,plan,source:service.source,basis,fixedCents,rateBps});
  }
  if(requireReviewed&&!selection.reviewed)throw Error("Confirm the selected plans, usage, quotas and extra-cost allowances before saving.");
  const estimate:CostEstimate={hostingFixedCents:lines.filter(l=>l.id!=="stripe").reduce((n,l)=>n+l.fixedCents,0),hostingRateBps:0,stripeFixedCents:lines.find(l=>l.id==="stripe")?.fixedCents??0,stripeRateBps:lines.find(l=>l.id==="stripe")?.rateBps??0,administrationBps};
  return {estimate,lines,snapshot:{catalogueVersion:catalogue.version,checkedOn:catalogueDate(catalogue),rateValues:{...catalogue.values},currency,enrolments:selection.enrolments,usdFx:needUsd?(currency==="USD"?"1":selection.usdFx):null,cadFx:selection.services.stripe?.plan!=="custom"&&selection.services.stripe?(currency==="CAD"?"1":selection.cadFx):null,selection:normalised,lines}};
}
