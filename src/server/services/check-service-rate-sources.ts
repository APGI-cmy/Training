import "server-only";
import { createHash } from "node:crypto";
import { costServices } from "@/lib/service-costs";
import { extractPriceSignals, observationStatus } from "@/lib/service-rate-observations";
import { assertStagingIsolation } from "@/server/environment-isolation";
import { rows, write } from "./company-structure";

export async function checkServiceRateSources() {
  assertStagingIsolation();
  const day=new Date().toISOString().slice(0,10);
  const results:{service:string;status:string}[]=[];
  const sources=costServices.filter(s=>s.source);
  for(let i=0;i<sources.length;i+=2) {
    await Promise.all(sources.slice(i,i+2).map(async source=>{
      let status:"observed"|"unchanged"|"changed"|"unavailable"="unavailable",hash:string|null=null,signals:string[]=[],summary="Pricing source could not be read. Retain reviewed rates and check manually.";
      const previous=await rows<{source_hash:string;status:string}>(`/rest/v1/service_rate_source_checks?source_id=eq.${source.id}&source_hash=not.is.null&order=checked_at.desc&select=source_hash,status&limit=1`);
      try {
        // Fixed official URLs only; no redirects, account data, arbitrary URLs or AI calls.
        const response=await fetch(source.source,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(12000),headers:{"user-agent":"APGI-Rate-Review/1.0","accept":"text/html,text/plain"}});
        if(!response.ok||!response.headers.get("content-type")?.match(/text\/(html|plain|markdown)/))throw Error("Source unavailable");
        if(Number(response.headers.get("content-length")??0)>3000000)throw Error("Source too large");
        const reader=response.body?.getReader();if(!reader)throw Error("Empty source");
        let html="",size=0;const decoder=new TextDecoder();
        try {for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3000000)throw Error("Source too large");html+=decoder.decode(value,{stream:true});}}finally{await reader.cancel();}
        signals=extractPriceSignals(html);if(!signals.length)throw Error("No readable prices");
        hash=createHash("sha256").update(JSON.stringify(signals)).digest("hex");status=observationStatus(previous[0]?.source_hash,hash);
        if(status==="unchanged"&&previous[0]?.status==="changed")status="changed";
        summary=status==="changed"?"Price figures on the source changed. A principal must check plan, currency, quota and terms before updating rates.":status==="observed"?"First source observation. Extracted figures are not verified plan rates; review against the official page.":"No change in the extracted price figures. This does not verify plan terms, discounts, quotas or your invoice.";
      } catch { /* Fail closed: unavailable evidence never replaces reviewed prices. */ }
      await write("/rest/v1/service_rate_source_checks?on_conflict=source_id,check_day",{source_id:source.id,check_day:day,checked_at:new Date().toISOString(),status,source_hash:hash,amount_signals:signals,summary});
      results.push({service:source.id,status});
    }));
  }
  return results;
}
