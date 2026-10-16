import { timingSafeEqual } from "node:crypto";
import { checkServiceRateSources } from "@/server/services/check-service-rate-sources";
export const maxDuration=120;
export async function GET(request:Request) {
  const secret=process.env.CRON_SECRET;
  const actual=Buffer.from(request.headers.get("authorization")??""),expected=Buffer.from(`Bearer ${secret??""}`);
  if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:"Unauthorized"},{status:401});
  try{return Response.json({results:await checkServiceRateSources()},{headers:{"cache-control":"no-store"}});}
  catch{return Response.json({error:"Source check could not complete; reviewed rates are unchanged."},{status:503});}
}
