export type RateDefinition = { key:string; service:string; label:string; currency:string; unit:string; amount:string };
export const rateDefinitions:RateDefinition[] = [
  {key:"supabase.pro",service:"supabase",label:"Pro organisation, one Micro included",currency:"USD",unit:"per month",amount:"25"},
  {key:"vercel.pro",service:"vercel",label:"Pro, one developer",currency:"USD",unit:"per month",amount:"20"},
  {key:"render.starter",service:"render",label:"Starter instance",currency:"USD",unit:"per month",amount:"7"},
  {key:"render.standard",service:"render",label:"Standard instance",currency:"USD",unit:"per month",amount:"25"},
  {key:"resend.free",service:"resend",label:"Free transactional plan (within quotas)",currency:"USD",unit:"per month",amount:"0"},
  {key:"resend.pro",service:"resend",label:"Pro transactional plan",currency:"USD",unit:"per month",amount:"20"},
  {key:"resend.scale",service:"resend",label:"Scale transactional plan",currency:"USD",unit:"per month",amount:"90"},
  {key:"aws.single",service:"aws",label:"Windows single-session licence",currency:"USD",unit:"per active user-month",amount:"4.19"},
  {key:"aws.multi",service:"aws",label:"Windows multi-session licence",currency:"USD",unit:"per active user-month",amount:"6.42"},
  {key:"aws.linux",service:"aws",label:"Linux Windows-licence charge",currency:"USD",unit:"per active user-month",amount:"0"},
  {key:"ai.terra.input",service:"ai",label:"GPT-5.6 Terra standard short-context input",currency:"USD",unit:"per million tokens",amount:"2"},
  {key:"ai.terra.output",service:"ai",label:"GPT-5.6 Terra standard short-context output",currency:"USD",unit:"per million tokens",amount:"12"},
  {key:"stripe.ca_domestic",service:"stripe",label:"Canada domestic card percentage",currency:"%",unit:"of payment",amount:"2.9"},
  {key:"stripe.ca_international",service:"stripe",label:"Canada international card percentage",currency:"%",unit:"of payment",amount:"3.7"},
  {key:"stripe.ca_fx",service:"stripe",label:"Canada international card plus conversion",currency:"%",unit:"of payment",amount:"5.7"},
  {key:"stripe.fixed",service:"stripe",label:"Canada card fixed fee",currency:"CAD",unit:"per successful payment",amount:"0.30"},
];
export type RateCatalogue = {version:string;checkedOn:string;values:Record<string,string>};
export const baselineRateCatalogue:RateCatalogue = {version:"2026-10-16.1",checkedOn:"2026-10-16",values:Object.fromEntries(rateDefinitions.map(r=>[r.key,r.amount]))};
export function validateRateValues(value:unknown):Record<string,string> {
  if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Enter a complete rate table.");
  const v=value as Record<string,unknown>;
  if(Object.keys(v).length!==rateDefinitions.length)throw Error("The rate table must contain every listed rate.");
  for(const d of rateDefinitions){
    const n=v[d.key];
    if(typeof n!=="string"||!/^\d{1,6}(\.\d{1,6})?$/.test(n)||Number(n)>100000|| (d.currency==="%"&&Number(n)>=100))throw Error(`Check the rate for ${d.label}.`);
    if(d.unit!=="per million tokens"&&n.includes(".")&&n.split(".")[1].length>2)throw Error(`Use at most two decimal places for ${d.label}.`);
    if(Number(n)===0&&d.amount!=="0")throw Error(`A positive rate is required for ${d.label}; use a documented custom quote for a waived charge.`);
    if(d.amount==="0"&&Number(n)!==0)throw Error(`${d.label} must remain zero; use a different plan for additional charges.`);
  }
  return Object.fromEntries(rateDefinitions.map(d=>[d.key,v[d.key] as string]));
}
export function rateAmount(catalogue:RateCatalogue,key:string):string {
  const value=catalogue.values[key];
  if(typeof value!=="string")throw Error("The service rate table is incomplete. Contact a platform principal.");
  return value;
}
export function catalogueDate(catalogue:RateCatalogue){return new Date(catalogue.checkedOn+"T00:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});}
