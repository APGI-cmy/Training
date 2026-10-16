import "server-only";
import { exchangeFeed, exchangeRate, parseExchangeFeed, validateExchangeQuote } from "@/lib/currency-rates";
import type { ServiceSelection } from "@/lib/service-costs";
import { assertStagingIsolation } from "@/server/environment-isolation";

export async function publishedExchangeQuotes(){
  assertStagingIsolation();
  const response=await fetch(exchangeFeed,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000),headers:{Accept:"application/json"}});
  if(!response.ok||Number(response.headers.get("content-length")??0)>100000)throw Error("The exchange-rate source is temporarily unavailable. Your inputs are retained; please retry.");
  const text=await response.text();if(text.length>100000)throw Error("Invalid exchange-rate response.");
  return parseExchangeFeed(JSON.parse(text));
}
export async function verifiedServiceExchange(selection:ServiceSelection,currency:string):Promise<ServiceSelection>{
  if(selection.fxMode!=="auto")return selection;
  const proposed=validateExchangeQuote(selection.fxQuote);
  const trusted=(await publishedExchangeQuotes()).find(q=>q.date===proposed.date);
  if(!trusted||JSON.stringify(trusted.cadPerUnit)!==JSON.stringify(proposed.cadPerUnit))throw Error("The selected exchange rates could not be verified. Refresh and review the estimate.");
  return {...selection,fxQuote:trusted,usdFx:exchangeRate(trusted,"USD",currency),cadFx:exchangeRate(trusted,"CAD",currency)};
}
