import {timingSafeEqual} from "node:crypto";
import {dailyReviewMail} from "@/server/services/course-reviews";
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,actual=Buffer.from(request.headers.get("authorization")??""),expected=Buffer.from(`Bearer ${secret??""}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:"Unauthorized"},{status:401});
 try{return Response.json(await dailyReviewMail(),{headers:{"cache-control":"no-store"}});}catch{return Response.json({error:"Review notification run incomplete; durable queue retained."},{status:503});}
}
