export const exchangeSource = "https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/";
export const exchangeFeed = "https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXZARCAD,FXEURCAD,FXGBPCAD/json?recent=10";
export const currencies = ["USD", "CAD", "ZAR", "EUR", "GBP"] as const;
export type Currency = typeof currencies[number];
export type ExchangeQuote = { date:string; checkedAt:string; source:string; cadPerUnit:Record<Currency,string> };
const scale=BigInt(1000000);
function decimal(value:unknown):bigint {
  if(typeof value!=="string"||!/^\d{1,6}(\.\d{1,6})?$/.test(value))throw Error("Invalid published exchange rate.");
  const [a,b=""]=value.split(".");const n=BigInt(a)*scale+BigInt(b.padEnd(6,"0"));
  if(n<=BigInt(0))throw Error("A positive exchange rate is required.");return n;
}
function fixed(n:bigint) {return `${n/scale}.${(n%scale).toString().padStart(6,"0")}`;}
export function validateExchangeQuote(value:unknown,now=Date.now()):ExchangeQuote {
  if(!value||typeof value!=="object")throw Error("Refresh the automatic exchange rates.");
  const q=value as ExchangeQuote;
  const day=typeof q.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(q.date)?Date.parse(q.date+"T00:00:00Z"):NaN;
  if(!Number.isFinite(day)||new Date(day).toISOString().slice(0,10)!==q.date||day>now||now-day>7*86400000)throw Error("Exchange rates are unavailable or more than seven days old. Refresh the rates before using this estimate.");
  if(q.source!==exchangeSource||typeof q.checkedAt!=="string"||!Number.isFinite(Date.parse(q.checkedAt))||!q.cadPerUnit)throw Error("Invalid exchange-rate source.");
  for(const c of currencies)decimal(q.cadPerUnit[c]);
  if(decimal(q.cadPerUnit.CAD)!==scale)throw Error("Invalid Canadian-dollar base rate.");
  return {date:q.date,checkedAt:q.checkedAt,source:exchangeSource,cadPerUnit:Object.fromEntries(currencies.map(c=>[c,q.cadPerUnit[c]])) as Record<Currency,string>};
}
export function exchangeRate(quote:ExchangeQuote,from:string,to:string):string {
  if(!currencies.includes(from as Currency)||!currencies.includes(to as Currency))throw Error("Unsupported conversion currency.");
  const a=decimal(quote.cadPerUnit[from as Currency]),b=decimal(quote.cadPerUnit[to as Currency]);
  return fixed((a*scale+b/BigInt(2))/b);
}
/** Display rounding only. Cost estimates separately round allowances up to whole cents. */
export function currencyEquivalent(amount:string,quote:ExchangeQuote,from:string,to:string):string {
  if(!/^\d{1,10}(\.\d{1,6})?$/.test(amount))return "—";
  const [a,b=""]=amount.split(".");const n=BigInt(a)*scale+BigInt(b.padEnd(6,"0"));
  const source=decimal(quote.cadPerUnit[from as Currency]),target=decimal(quote.cadPerUnit[to as Currency]);
  const cents=(n*source*BigInt(100)+scale*target/BigInt(2))/(scale*target);
  return `${cents/BigInt(100)}.${(cents%BigInt(100)).toString().padStart(2,"0")}`;
}
export function parseExchangeFeed(value:unknown,now=Date.now()):ExchangeQuote[] {
  const data=value as {observations?:{d?:string;[key:string]:unknown}[]};
  if(!data||!Array.isArray(data.observations)||data.observations.length>30)throw Error("The currency source returned an invalid response.");
  const quotes:ExchangeQuote[]=[];
  for(const row of data.observations){
    try {
      const cadPerUnit={CAD:"1"} as Record<Currency,string>;
      for(const c of ["USD","ZAR","EUR","GBP"] as const)cadPerUnit[c]=(row[`FX${c}CAD`] as {v:string})?.v;
      quotes.push(validateExchangeQuote({date:row.d,checkedAt:new Date(now).toISOString(),source:exchangeSource,cadPerUnit},now));
    }catch{/* Skip holidays, missing observations and expired rates; never assume parity. */}
  }
  if(!quotes.length)throw Error("No recent complete exchange rates are available. Please retry later.");
  return quotes.sort((a,b)=>b.date.localeCompare(a.date));
}
